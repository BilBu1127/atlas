#!/usr/bin/env python3
"""Validate reader changes and atomically activate one PACK containing its reader.
No research, tier/valuation decisions, approval issuance, or scheduled execution.
"""
import argparse
import copy
import datetime
import hashlib
import json
import math
import os
from pathlib import Path
import re
import struct
import tempfile
import fcntl
from contextlib import contextmanager
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
PAIR = '_reader_pair'
SCHEME = 'atlas-pack-core-json-v1'
BASE_PACK = '5f211726e01a7e27d63440905adab531374d54293c1c4b29e4c8dcff39720eea'
BASE_READER = '36cd2dae494ea97c335449ea8592bac9ba0e81c8b543b3aa75936357a6d5f925'
HEX = re.compile(r'^[0-9a-f]{64}$')
RULES = ('00_ATLAS_OS.md', '01_ATLAS_TAXONOMY_SCORING.md',
         '02_ATLAS_BUILD_GOVERNANCE.md', '03_ATLAS_UPDATE_GOVERNANCE.md',
         'SOP.md', 'ATLAS_USAGE.md')
UPDATE_CHECKS = ('entry_and_mode_scope', 'sources_counterevidence_and_periods',
                 'tier_two_actual_independent_signals', 'propagation_and_debt',
                 'dd_customs_original_bands_and_history', 'stance_after_tier_price_firewall',
                 'schema_identity_membership_and_sources', 'reader_dates_and_scope',
                 'privacy_and_remaining_holds')

# Reviewed private interpretation of the retained access ledger. Hashes
# bind a version, not the truth of an actor's declarations or its web activity.
ACCESS_HISTORY_SHA256 = '636a39aba4a105498d919bd8d56cf41c441febe2708bc7b4b4e775de4e01aec0'
ACCESS_LEDGER_SHA256 = '9ffa6d6e3fa36faeb72ae5b47b3cbe6e5104b89664d7a3509ac486813f9e9f62'
ACCESS_DENIALS = {'EXPLICIT_DENIAL', 'AUTH_REQUIRED', 'TOOL_REFUSAL', 'REQUEST_PROHIBITED'}
ACCESS_NORMAL = {'RESOLVED_TRANSPORT', 'BODY_SCOPE_LIMITATION'}
ACCESS_CHECK = 'pre_request_access_history_and_actor_limits'

def private_path(path):
    path=Path(path).resolve()
    require(path != ROOT and ROOT not in path.parents, 'ACCESS_ARTIFACT_MUST_STAY_PRIVATE')
    return path

def access_file(ref, parent, snapshots):
    require(isinstance(ref,dict) and HEX.fullmatch(str(ref.get('sha256',''))), 'ACCESS_FILE_REFERENCE_REQUIRED')
    p=Path(ref.get('file',''));p=private_path(p if p.is_absolute() else parent/p)
    raw=p.read_bytes();require(hashlib.sha256(raw).hexdigest()==ref['sha256'], 'ACCESS_FILE_HASH_MISMATCH')
    snapshots[p]=raw
    return p,raw

def access_time(value):
    require(isinstance(value,str) and datetime.datetime.fromisoformat(value.replace('Z','+00:00')).tzinfo is not None,
            'ACCESS_EXPLICIT_TIMEZONE_REQUIRED')
    return parse_time(value)

def load_access_history(path, snapshots):
    path=private_path(path);raw=path.read_bytes();snapshots[path]=raw
    require(hashlib.sha256(raw).hexdigest()==ACCESS_HISTORY_SHA256, 'ACCESS_HISTORY_VERSION_MISMATCH')
    history=load(path)
    _,baseline=access_file(history['baseline_registry'],path.parent,snapshots)
    require(hashlib.sha256(baseline).hexdigest()==ACCESS_LEDGER_SHA256, 'ACCESS_LEDGER_VERSION_MISMATCH')
    ledger=json.loads(baseline)
    entries=history.get('entries',[])
    require(history.get('exact_url_count')==len(entries)==len({e['url'] for e in entries}) and
            ledger.get('exact_url_count')==len(ledger['entries']) and
            {e['url'] for e in entries}=={e['url'] for e in ledger['entries']}, 'ACCESS_LEDGER_INCOMPLETE')
    for file,ref in history['proofs'].items():access_file({'file':file,**ref},path.parent,snapshots)
    return history

def access_identity(request):
    return {k:request[k] for k in ('operation','url','query','link_ref','link_id','source_ref','lineno','pattern','pageno','domains','recency') if k in request}

def capture_item_matches(op, item, request):
    if op!=request['operation']:return False
    if op=='search':return item.get('q')==request['query'] and all(item.get(k)==request.get(k) for k in ('domains','recency'))
    if op=='click':return item.get('ref_id')==request['link_ref'] and item.get('id')==request['link_id']
    if op in {'open','find','screenshot'} and item.get('ref_id')==request.get('source_ref',request['url']):
        keys={'open':('lineno',),'find':('pattern',),'screenshot':('pageno',)}[op]
        return all(item.get(k)==request.get(k) for k in keys)
    return False

def capture_items(raw):
    document=json.loads(raw)
    require(isinstance(document,dict), 'ACCESS_CAPTURE_TOOL_ARGUMENTS_REQUIRED')
    arguments=document.get('request',document.get('arguments',{}))
    require(isinstance(arguments,dict) and arguments and
            set(arguments)<={'search_query','open','click','find','screenshot','response_length'}, 'ACCESS_UNSUPPORTED_TOOL_ARGUMENTS')
    items=[]
    for op,values in arguments.items():
        if op=='response_length':continue
        require(isinstance(values,list) and values, 'ACCESS_CAPTURE_TOOL_ARGUMENTS_REQUIRED')
        op='search' if op=='search_query' else op
        allowed={'search':{'q','domains','recency'},'open':{'ref_id','lineno'},'click':{'ref_id','id'},
                 'find':{'ref_id','pattern'},'screenshot':{'ref_id','pageno'}}[op]
        for item in values:
            require(isinstance(item,dict) and set(item)<=allowed, 'ACCESS_UNSUPPORTED_TOOL_REQUEST_ARGUMENT')
            items.append((op,item))
    require(items,'ACCESS_CAPTURE_TOOL_ARGUMENTS_REQUIRED')
    return items

def capture_request_matches(raw, request):
    return any(capture_item_matches(op,item,request) for op,item in capture_items(raw))

def capture_result(raw, url):
    document=json.loads(raw)
    text=document if isinstance(document,str) else document.get('response',document.get('result',''))
    if url:
        sections=[s for s in text.split('--------------------------------------------------------------------------------')
                  if ('"ref_id":"'+url+'"') in s or ('"ref_id": "'+url+'"') in s]
        if len(sections)==1:
            text=sections[0]
            require(text.count('Source: open(')<=1, 'ACCESS_CAPTURE_RESPONSE_SECTIONS_AMBIGUOUS')
        elif 'Source: open' in text:return None
    # Error wrappers only: a successful business report mentioning 403 is not
    # an access refusal. Never classify another URL's batch section.
    wrapper=re.match(r'^(?:Internal Error|Error|Access denied|Permission denied|Request prohibited|Authentication required|Sign in required|Login required|요청\s*금지)(?:\s*\(\))?\s*(?:\n|:|$)',text.lstrip(),re.I)
    error_line=re.search(r'^L0:\s*(?:Failed to fetch|URL .*(?:not accessible|not safe)|Request prohibited|요청 금지)',text[:1800],re.I|re.M)
    if not (wrapper or error_line):return None
    if re.search(r'HTTP(?: Error)?\s*403|\(?403\)?\s*Forbidden',text[:1800],re.I):return 'EXPLICIT_DENIAL'
    if re.search(r'access denied|permission denied|접근\s*거부',text[:1800],re.I):return 'EXPLICIT_DENIAL'
    if re.search(r'HTTP(?: Error)?\s*401|\(?401\)?\s*Unauthorized|authentication required|login required|sign in required',text[:1800],re.I):return 'AUTH_REQUIRED'
    if re.search(r'request prohibited|요청\s*금지',text[:1800],re.I):return 'REQUEST_PROHIBITED'
    if re.search(r'not safe to open',text[:1800],re.I):return 'TOOL_REFUSAL'
    if re.search(r'HTTP(?: Error)?\s*404|\(?404\)?\s*Not Found',text[:1800],re.I):return 'NOT_FOUND'
    if 'not accessible via this tool' in text[:1800]:return 'TOOL_UNAVAILABLE_UNSPECIFIED'
    return 'TRANSPORT_FAILURE_UNSPECIFIED'

def add_run_failures(history, records, parent, snapshots, before):
    history=copy.deepcopy(history)
    by_url={e['url']:e for e in history['entries']}
    for record in records:
        url=record['url'];require(urlsplit(url).scheme in {'https','http'},'ACCESS_FAILURE_URL_REQUIRED')
        require(access_time(record['observed_at_utc'])<=before, 'ACCESS_FAILURE_FROM_FUTURE')
        _,raw=access_file(record['capture'],parent,snapshots)
        actual=capture_result(raw,url)
        require(actual and actual==record.get('result_class'), 'ACCESS_FAILURE_CLASS_NOT_SUPPORTED_BY_CAPTURE')
        entry=by_url.get(url)
        if entry is None:
            entry={'url':url,'subject_ids':[record['subject_id']],'related_history_urls':[],'observations':[]}
            history['entries'].append(entry);by_url[url]=entry
        entry['observations'].append({'failure_class':actual,'original_reason':'See exact hash-bound current capture',
                                      'source':record['capture'],'observed_at_utc':record['observed_at_utc']})
    return history

def access_decision(request, history, parent, snapshots, at):
    """Offline source-selection decision. This does not intercept actor tools."""
    require(request.get('operation') in {'search','open','click','find','screenshot'}, 'ACCESS_OPERATION_REQUIRED')
    require(all(isinstance(request.get(k),str) and request[k].strip() for k in
                ('request_id','subject_id','resource_id','purpose')), 'ACCESS_REQUEST_IDENTITY_REQUIRED')
    require(request.get('purpose') in {'ordinary','retry','independent_original','failure_fallback'}, 'ACCESS_PURPOSE_REQUIRED')
    require(request.get('bypass_intent') is False and isinstance(request.get('related_history_urls'),list), 'ACCESS_RELATION_DECLARATION_REQUIRED')
    url=request.get('url');by_url={e['url']:e for e in history['entries']}
    if request['operation']=='search':
        require(isinstance(request.get('query'),str) and request['query'].strip() and not url, 'ACCESS_SEARCH_QUERY_REQUIRED')
    else:
        require(isinstance(url,str) and urlsplit(url).scheme in {'https','http'} and urlsplit(url).hostname and
                not urlsplit(url).username, 'ACCESS_EXACT_URL_REQUIRED')
        require(request.get('source_ref',url)==url, 'ACCESS_OPAQUE_SOURCE_REF_NOT_ELIGIBLE_USE_EXACT_TARGET')
    if request['operation']=='click':
        require(isinstance(request.get('link_ref'),str) and type(request.get('link_id')) is int, 'ACCESS_CLICK_REFERENCE_REQUIRED')
    if request['operation']=='find':require(isinstance(request.get('pattern'),str) and request['pattern'], 'ACCESS_FIND_PATTERN_REQUIRED')
    if request['operation']=='screenshot':require(type(request.get('pageno')) is int and request['pageno']>=0, 'ACCESS_SCREENSHOT_PAGE_REQUIRED')
    require(set(request['related_history_urls'])<=set(by_url), 'ACCESS_UNKNOWN_RELATED_HISTORY')
    exact=by_url.get(url)
    def classes(e):return {o['failure_class'] for o in e['observations']}
    explicit=[e for e in history['entries'] if classes(e)&ACCESS_DENIALS and
              (e['url'] in request['related_history_urls'] or request['subject_id'] in e['subject_ids'] or
               (url and urlsplit(e['url']).hostname==urlsplit(url).hostname))]
    required_related=set(exact.get('related_history_urls',[])) if exact else set()
    related=[by_url[u] for u in request['related_history_urls']]
    result={'request_id':request['request_id'],'identity':access_identity(request),
            'history_classes':sorted(classes(exact)) if exact else [],
            'related_restrictions':sorted({e['url'] for e in explicit}|required_related),
            'max_requests':0,'decision':'HOLD','reason':''}
    def hold(reason):return {**result,'reason':reason}
    if exact and classes(exact)&ACCESS_DENIALS:return hold('EXPLICIT_RESTRICTION_NO_RETRY_OR_ALTERNATE_DELIVERY')
    if any(request['resource_id']==e['url'] for e in explicit):return hold('SAME_DENIED_RESOURCE_ID_DESPITE_DIFFERENT_URL')
    if required_related-set(request['related_history_urls']):return hold('PRIOR_DENIED_RESOURCE_RELATION_NOT_REVIEWED')
    if request['purpose']=='failure_fallback' and (explicit or any(classes(e)&ACCESS_DENIALS for e in related)):
        return hold('DENIED_RESOURCE_HOST_PATH_FALLBACK')
    if request['operation']=='search':
        # A discovery query does not fetch the denied document. Do not turn an
        # exact-resource refusal into an issuer-wide prohibition on searching.
        return {**result,'decision':'ALLOW_SCOPED','max_requests':1,'reason':'DISCOVERY_QUERY_ONLY_NO_DOCUMENT_ACCESS_CLEARANCE'}
    # Link metadata must be read before clicking, including the actual resolved
    # URL. A ref from another parallel response cannot stand in for it.
    discovery=request.get('discovery')
    if request['operation']=='click' or request['purpose']=='independent_original' or (explicit and not exact):
        if not isinstance(discovery,dict):return hold('SAVED_DISTINCT_SOURCE_PROVENANCE_REQUIRED')
        p,raw=access_file(discovery.get('artifact'),parent,snapshots)
        text=raw.decode('utf-8')
        if not (discovery.get('target_url')==url and url in text and
                isinstance(discovery.get('title'),str) and discovery['title'] in text and
                isinstance(discovery.get('publisher'),str) and discovery['publisher'] in text and
                discovery.get('document_id')==request['resource_id'] and
                access_time(discovery.get('recorded_at_utc'))<=at):
            return hold('LINK_OR_DOCUMENT_IDENTITY_MISMATCH')
        if request['operation']=='click':
            metadata=json.loads(raw)
            mapping={'link_ref':request['link_ref'],'link_id':request['link_id'],'target_url':url,
                     'title':discovery['title'],'publisher':discovery['publisher']}
            if not (discovery.get('link_ref')==request['link_ref'] and discovery.get('link_id')==request['link_id'] and
                    isinstance(metadata,dict) and mapping in metadata.get('verified_links',[])):
                return hold('CLICK_REF_LINK_MISMATCH')
    if explicit:
        if not (request['purpose']=='independent_original' and discovery and
                discovery.get('distinct_from_denied_resource') is True and
                discovery.get('not_alternate_delivery') is True and
                {e['url'] for e in explicit}<=set(request['related_history_urls'])):
            return hold('DENIED_RESOURCE_RELATION_OR_DISTINCT_ORIGINAL_UNPROVEN')
    non_denial=exact and (classes(exact)-ACCESS_NORMAL)
    if non_denial:
        authority=request.get('retry_authority')
        if not authority:return hold('NON_DENIAL_HISTORY_REQUIRES_SCOPED_RETRY_BASIS')
        _,raw=access_file(authority,parent,snapshots);basis=json.loads(raw)
        if not (basis.get('authority_kind') in {'original_rule','user_instruction'} and basis.get('original_text') and
                basis.get('url')==url and basis.get('max_requests')==1 and basis.get('scope')=='exact_url' and
                basis.get('denials_override') is False and
                access_time(basis.get('valid_from_utc'))<=at<=access_time(basis.get('valid_until_utc')) and
                classes(exact)<=set(basis.get('failure_classes',[]))):return hold('RETRY_BASIS_SCOPE_BUDGET_OR_TIME_MISMATCH')
        if request['purpose']!='retry':return hold('RETRY_PURPOSE_REQUIRED')
    return {**result,'decision':'ALLOW_SCOPED','max_requests':1,
            'reason':'BOUNDED_NON_DENIAL_RETRY' if non_denial else 'DISTINCT_OR_ORDINARY_PUBLIC_SOURCE'}

def make_research_handoff(plan_path, history_path, context_path, snapshots, prepared_at=None):
    history=load_access_history(history_path,snapshots)
    plan_path=private_path(plan_path);context_path=private_path(context_path)
    for p in (plan_path,context_path):snapshots[p]=p.read_bytes()
    plan=load(plan_path);context_sha=hashlib.sha256(snapshots[context_path]).hexdigest()
    require(plan.get('schema_version')==1 and plan.get('run_context_sha256')==context_sha and
            isinstance(plan.get('researcher_id'),str) and plan['researcher_id'].strip(), 'ACCESS_RESEARCHER_CONTEXT_REQUIRED')
    now=prepared_at or datetime.datetime.now(datetime.timezone.utc).isoformat()
    require(access_time(plan.get('planned_at_utc'))<=access_time(now)<=datetime.datetime.now(datetime.timezone.utc), 'ACCESS_PLAN_FROM_FUTURE')
    history=add_run_failures(history,plan.get('prior_failures',[]),plan_path.parent,snapshots,access_time(now))
    requests=plan.get('requests');require(isinstance(requests,list) and requests and
            len({r['request_id'] for r in requests})==len(requests), 'ACCESS_REQUESTS_REQUIRED_OR_DUPLICATE')
    decisions=[access_decision(r,history,plan_path.parent,snapshots,access_time(now)) for r in requests]
    return {'schema_version':1,'run_context_sha256':context_sha,'researcher_id':plan['researcher_id'],
            'history_sha256':ACCESS_HISTORY_SHA256,'baseline_registry_sha256':ACCESS_LEDGER_SHA256,'exact_url_count':history['exact_url_count'],
            'plan':{'file':str(plan_path),'sha256':hashlib.sha256(snapshots[plan_path]).hexdigest()},
            'prepared_at_utc':now,'requests':requests,'decisions':decisions,'prior_failures':plan.get('prior_failures',[]),
            'actor_limits':'No web interception. Actor must acknowledge before requests, honor decisions, record every attempt, and stop/replan after failure. Hashes do not authenticate actor or chronology.'}

def validate_access_audit(audit_path, history_path, context_path, snapshots):
    require(audit_path and history_path and context_path, 'PRE_REQUEST_ACCESS_HANDOFF_AUDIT_REQUIRED')
    audit_path=private_path(audit_path);snapshots[audit_path]=audit_path.read_bytes();audit=load(audit_path)
    context_sha=hashlib.sha256(Path(context_path).read_bytes()).hexdigest()
    require(audit.get('schema_version')==1 and audit.get('run_context_sha256')==context_sha and
            audit.get('complete_request_inventory') is True and audit.get('unlisted_requests')==0 and
            audit.get('actor_limits_acknowledged') is True, 'ACCESS_INVENTORY_OR_ACTOR_LIMITS_MISSING')
    sessions=audit.get('sessions');require(isinstance(sessions,list), 'ACCESS_SESSIONS_REQUIRED')
    used=set();retried_urls=set();failures=[];request_ids=set();researchers=set();batches={}
    baseline=load_access_history(history_path,snapshots)
    if not sessions:
        # A connector-only run must not invent web plans just to satisfy this
        # web-format checker. Real connector activity still needs actor review.
        ack=audit.get('policy_ack',{})
        require(audit.get('web_request_inventory_count')==0 and
                audit.get('supported_capture_scope')=='NO_SUPPORTED_WEB_REQUESTS' and
                ack.get('history_sha256')==ACCESS_HISTORY_SHA256 and
                isinstance(ack.get('researcher_id'),str) and ack['researcher_id'].strip() and
                ack.get('acknowledged_before_connector_requests') is True and
                access_time(ack.get('acknowledged_at_utc'))<=datetime.datetime.now(datetime.timezone.utc),
                'ACCESS_EMPTY_WEB_SCOPE_ACK_REQUIRED')
        _,actor_raw=access_file(audit.get('connector_actor_evidence'),audit_path.parent,snapshots)
        return {'access_history_sha256':ACCESS_HISTORY_SHA256,
                'access_audit_sha256':hashlib.sha256(snapshots[audit_path]).hexdigest(),
                'access_researchers_sha256':sha([ack['researcher_id']]),
                'access_connector_evidence_sha256':hashlib.sha256(actor_raw).hexdigest()}
    require('web_request_inventory_count' not in audit or
            audit['web_request_inventory_count']==sum(len(s.get('outcomes',[])) for s in sessions),
            'ACCESS_WEB_INVENTORY_COUNT_MISMATCH')
    for session in sessions:
        p,raw=access_file(session['handoff'],audit_path.parent,snapshots);handoff=json.loads(raw)
        plan_path,_=access_file(handoff['plan'],p.parent,snapshots)
        recomputed=make_research_handoff(plan_path,history_path,context_path,snapshots,handoff['prepared_at_utc'])
        require(handoff==recomputed, 'ACCESS_HANDOFF_PLAN_OR_POLICY_MISMATCH')
        ack=session.get('ack',{});researchers.add(handoff['researcher_id'])
        require(ack.get('researcher_id')==handoff['researcher_id'] and ack.get('handoff_sha256')==hashlib.sha256(raw).hexdigest() and
                ack.get('history_sha256')==ACCESS_HISTORY_SHA256 and
                access_time(handoff['prepared_at_utc'])<=access_time(ack.get('acknowledged_at_utc'))<=datetime.datetime.now(datetime.timezone.utc), 'ACCESS_PRE_REQUEST_ACK_REQUIRED')
        decisions={d['request_id']:d for d in handoff['decisions']};requests={r['request_id']:r for r in handoff['requests']}
        outcomes=session.get('outcomes',[])
        require(len(outcomes)==len(decisions) and len({o['request_id'] for o in outcomes})==len(decisions) and
                {o['request_id'] for o in outcomes}==set(decisions), 'ACCESS_OUTCOME_INVENTORY_MISMATCH')
        last=access_time(ack['acknowledged_at_utc'])
        for outcome in outcomes:
            key=outcome['request_id'];require(key not in request_ids,'ACCESS_DUPLICATE_REQUEST_ID');request_ids.add(key)
            request=requests[key];decision=decisions[key]
            require(type(outcome.get('attempted')) is bool, 'ACCESS_ATTEMPT_STATUS_REQUIRED')
            if not outcome['attempted']:continue
            stamp=access_time(outcome.get('attempted_at_utc'))
            require(last<=stamp<=datetime.datetime.now(datetime.timezone.utc), 'ACCESS_REQUEST_PRECEDES_ACK_OR_ORDER_INVALID');last=stamp
            require(decision['decision']=='ALLOW_SCOPED', 'ACCESS_ATTEMPTED_HELD_REQUEST')
            require(outcome.get('request_identity')==access_identity(request), 'ACCESS_ACTUAL_REQUEST_IDENTITY_MISMATCH')
            _,proof=access_file(outcome.get('capture'),audit_path.parent,snapshots)
            require(capture_request_matches(proof,request), 'ACCESS_CAPTURE_TOOL_ARGUMENTS_MISMATCH')
            invocation=outcome.get('invocation_id')
            require(isinstance(invocation,str) and invocation.strip(), 'ACCESS_TOOL_INVOCATION_ID_REQUIRED')
            batch=batches.setdefault(invocation,{'raw':proof,'requests':[],'attempts':[],'stamp':stamp})
            require(batch['raw']==proof and batch['stamp']==stamp, 'ACCESS_TOOL_INVOCATION_CAPTURE_OR_TIME_MISMATCH')
            batch['requests'].append(request)
            token=request.get('url') or request['query']
            require(token in proof.decode('utf-8'), 'ACCESS_CAPTURE_IDENTITY_NOT_FOUND')
            result=outcome.get('result_class')
            require(result in {'SUCCESS','EXPLICIT_DENIAL','AUTH_REQUIRED','TOOL_REFUSAL','REQUEST_PROHIBITED','NOT_FOUND',
                    'TOOL_UNAVAILABLE_UNSPECIFIED','TRANSPORT_FAILURE_UNSPECIFIED','SEARCH_NO_RESULT','CONTENT_INCOMPLETE'}, 'ACCESS_RESULT_CLASS_REQUIRED')
            detected=capture_result(proof,request.get('url'))
            require(detected is None or detected==result, 'ACCESS_RESULT_CLASS_CONTRADICTS_CAPTURE')
            batch['attempts'].append((stamp,detected,request,outcome,plan_path.parent))
    for batch in batches.values():
        items=capture_items(batch['raw'])
        require(all(sum(capture_item_matches(op,item,r) for r in batch['requests'])==1 for op,item in items) and
                all(sum(capture_item_matches(op,item,r) for op,item in items)==1 for r in batch['requests']),
                'ACCESS_CAPTURE_BATCH_INVENTORY_MISMATCH')
    # Sessions may interleave. Evaluate real invocation time, not list order.
    # Items in one batch were requested together; apply its failures afterward.
    ordered=sorted(batches.items(),key=lambda x:(x[1]['stamp'],not any(a[1] for a in x[1]['attempts']),x[0]))
    for _,batch in ordered:
        live_history=add_run_failures(baseline,failures,audit_path.parent,snapshots,batch['stamp'])
        for stamp,detected,request,outcome,parent in batch['attempts']:
            identity=request.get('url') or ('search:'+request['query']);token=sha(access_identity(request))
            require(identity not in retried_urls if request['purpose']=='retry' else token not in used, 'ACCESS_REQUEST_BUDGET_EXCEEDED')
            used.add(token)
            if request['purpose']=='retry':retried_urls.add(identity)
            live_decision=access_decision(request,live_history,parent,snapshots,stamp)
            require(live_decision['decision']=='ALLOW_SCOPED', 'ACCESS_FAILURE_REPLAN_REQUIRED')
        for stamp,detected,request,outcome,parent in batch['attempts']:
            if detected and request.get('url'):
                failures.append({'url':request['url'],'subject_id':request['subject_id'],'result_class':detected,
                                 'capture':outcome['capture'],'observed_at_utc':outcome['attempted_at_utc']})
    return {'access_history_sha256':ACCESS_HISTORY_SHA256,'access_audit_sha256':hashlib.sha256(snapshots[audit_path]).hexdigest(),
            'access_researchers_sha256':sha(sorted(researchers))}

MODE_B_CHECK = 'mode_b_independent_discovery_exact_bytes_and_holds'

def validate_mode_b_evidence(path, context_path, snapshots):
    """Check a private receipt contract, not perform discovery or source review."""
    require(path and context_path, 'MODE_B_EVIDENCE_REQUIRED')
    path=private_path(path);snapshots[path]=path.read_bytes();e=load(path)
    require(e.get('schema_version')==1 and e.get('run_context_sha256')==hashlib.sha256(Path(context_path).read_bytes()).hexdigest(), 'MODE_B_CONTEXT_MISMATCH')
    require(access_time(e['observed_from_utc'])<=access_time(e['observed_to_utc'])<=datetime.datetime.now(datetime.timezone.utc) and
            e.get('receipt_time_is_business_cutoff') is False, 'MODE_B_OBSERVATION_TIME_REQUIRED')
    discovery=e.get('discovery',{})
    require(discovery.get('independent_of_known_ids') is True and discovery.get('global_completeness') is False,
            'MODE_B_INDEPENDENT_BOUNDED_DISCOVERY_REQUIRED')
    required_holds={'BOUNDED_DISCOVERY_SCOPE'};discovered=set();seen_folders=set()
    listings=discovery.get('folder_listings',[]);require(listings,'MODE_B_FOLDER_LISTING_REQUIRED')
    for listing in listings:
        _,raw=access_file(listing['capture'],path.parent,snapshots);capture=json.loads(raw)
        args=capture.get('arguments',{});result=capture.get('result',{})
        require(set(args)=={'url','top_k'} and type(args['top_k']) is int and 0<args['top_k']<=1000 and
                not result.get('isError'), 'MODE_B_SUPPORTED_FOLDER_LIST_REQUIRED')
        require(args['url'] not in seen_folders,'MODE_B_DUPLICATE_FOLDER');seen_folders.add(args['url'])
        rows=result.get('structuredContent',{}).get('files')
        require(isinstance(rows,list) and len({r['id'] for r in rows})==len(rows), 'MODE_B_FOLDER_ROWS_REQUIRED')
        if len(rows)>=args['top_k']:required_holds.add('LIST_LIMIT_OR_COMPLETENESS_UNCERTAIN')
        require(type(listing.get('include_for_DD')) is bool,'MODE_B_FOLDER_SCOPE_REQUIRED')
        if listing['include_for_DD']:
            discovered|={r['id'] for r in rows if r.get('mime_type')=='application/json'}
        else:
            require(listing.get('exclusion_reason'),'MODE_B_EXCLUSION_REASON_REQUIRED')
            required_holds.add('EXCLUDED_SCOPE')
    if discovery.get('excluded_scopes'):required_holds.add('EXCLUDED_SCOPE')
    if discovery.get('folder_pages_complete') is not True:required_holds.add('LIST_LIMIT_OR_COMPLETENESS_UNCERTAIN')
    if e.get('capture_uncertainties'):required_holds.add('CAPTURE_UNCERTAINTY')
    exclusions=discovery.get('excluded_json',[])
    require(all(x.get('id') in discovered and x.get('reason') for x in exclusions) and
            len({x['id'] for x in exclusions})==len(exclusions), 'MODE_B_JSON_EXCLUSION_INVALID')
    if exclusions:required_holds.add('EXCLUDED_SCOPE')
    discovered-={x['id'] for x in exclusions}
    _,raw=access_file(e['baseline'],path.parent,snapshots);baseline=json.loads(raw)['files']
    require(len({x['drive_id'] for x in baseline})==len(baseline), 'MODE_B_BASELINE_DUPLICATE_ID')
    require(all(isinstance(x['drive_id'],str) and x['drive_id'] and HEX.fullmatch(str(x.get('sha256',''))) and
                type(x.get('bytes')) is int and x['bytes']>=0 for x in baseline), 'MODE_B_BASELINE_BYTES_REQUIRED')
    prior={x['drive_id']:x for x in baseline};records=e.get('files',[])
    require(len({x['id'] for x in records})==len(records) and {x['id'] for x in records}==discovered,
            'MODE_B_DISCOVERED_MEMBERSHIP_MISMATCH')
    compare={'new_ids':sorted(discovered-set(prior)),'not_discovered_ids':sorted(set(prior)-discovered),
             'common_ids':sorted(discovered&set(prior))}
    require(e.get('id_comparison')==compare, 'MODE_B_ID_COMPARISON_MISMATCH')
    if compare['not_discovered_ids']:required_holds.add('BASELINE_NOT_DISCOVERED')
    for record in records:
        old=prior.get(record['id']);current=record.get('current')
        if current is None:
            expected='UNAVAILABLE';required_holds.add('CONTENT_UNAVAILABLE')
        else:
            _,raw=access_file(current,path.parent,snapshots)
            require(type(current.get('bytes')) is int and len(raw)==current['bytes'], 'MODE_B_RAW_BYTES_MISMATCH')
            expected='NEW' if old is None else ('SAME_BYTES' if old['sha256']==current['sha256'] and old['bytes']==len(raw) else 'CHANGED')
        require(record.get('classification')==expected,'MODE_B_CONTENT_CLASSIFICATION_MISMATCH')
        if expected=='SAME_BYTES':
            require(record.get('new_original_read') is False and record.get('new_business_evidence') is False,
                    'MODE_B_IDENTICAL_BYTES_ARE_NOT_NEW_RESEARCH')
        elif expected in {'NEW','CHANGED'} and record.get('content_review')!='REVIEWED':required_holds.add('CONTENT_REVIEW_PENDING')
        library=record.get('library_original_version',{});drive=record.get('drive_revision',{})
        require(library.get('namespace')=='LIBRARY_ORIGINAL_VERSION' and drive.get('namespace')=='DRIVE_REVISION' and
                library.get('derived_from_drive_revision') is False and drive.get('revision_bound_bytes_proved') is False,
                'MODE_B_VERSION_NAMESPACES_REQUIRED')
        require(library.get('status') in {'UNKNOWN','HISTORICAL_ONLY','VERIFIED_ORIGINAL'}, 'MODE_B_LIBRARY_VERSION_STATUS_REQUIRED')
        if library.get('status')=='VERIFIED_ORIGINAL':
            require(type(library.get('value')) in {str,int} and str(library['value']).strip(), 'MODE_B_LIBRARY_VERSION_VALUE_REQUIRED')
            access_file(library['source_evidence'],path.parent,snapshots)
        else:required_holds.add('LIBRARY_ORIGINAL_VERSION_UNVERIFIED')
        require(not library.get('value') or library['value'] not in {drive.get('before'),drive.get('after')}, 'MODE_B_DRIVE_REVISION_IS_NOT_LIBRARY_VERSION')
        required_holds.add('DRIVE_REVISION_NOT_ATOMIC')
        if not drive.get('before') or drive.get('before')!=drive.get('after'):required_holds.add('DRIVE_REVISION_UNKNOWN_OR_CHANGED')
    require(isinstance(e.get('holds'),list) and required_holds<=set(e['holds']), 'MODE_B_REQUIRED_HOLDS_MISSING')
    # Connector invocation evidence stays private and needs real independent
    # inspection; this does not add a Drive client or intercept its tool calls.
    _,actor_raw=access_file(e['actor_request_evidence'],path.parent,snapshots)
    return {'mode_b_evidence_sha256':hashlib.sha256(snapshots[path]).hexdigest(),
            'mode_b_actor_evidence_sha256':hashlib.sha256(actor_raw).hexdigest()}

def canonical(v):
    return json.dumps(v, ensure_ascii=False, sort_keys=True, separators=(',', ':'), allow_nan=False).encode()

def sha(v): return hashlib.sha256(canonical(v)).hexdigest()

def load(path):
    return json.loads(Path(path).read_text(), parse_constant=lambda s: (_ for _ in ()).throw(ValueError(s)))

def require(ok, reason):
    if not ok: raise ValueError(reason)

def core(pack): return {k:v for k,v in pack.items() if k != PAIR}

# Selection is a read contract, not an economic judgment. The JavaScript adapter
# implements this same closed contract; private tests share fixtures across both.
UPDATE_ROLES = {
    'business': 'weekly_full_scope_20261018',
    'judgment': 'core_rejudgment_20261017',
    'primary_extension': 'weekly_primary_extension_20261018',
    'gap_completion': 'weekly_gap_completion_20261018',
    'coverage': 'mode_b_drive_backup_reconciliation_20261018',
}
UPDATE_STATES = {'REVIEWED_SCOPED', 'DATED_RETAINED', 'NOT_RUN', 'HOLD'}
# Exact inherited exceptions, not new admissions; baseline core478d8926.
LEGACY_MEMBERSHIP_EXCEPTIONS = {('node_only', 'VG', 'ENE-04'), ('card_only', 'AMT', 'RLE-02'), ('card_only', 'ASX', 'ITC-02'), ('card_only', 'CRH', 'MAT-04'), ('node_only', 'ALM', 'MAT-02'), ('card_only', 'FOXA', 'COM-02'), ('node_only', 'BE', 'IND-03'), ('card_only', 'AAL', 'IND-08'), ('card_only', '2359.HK', 'HLT-04'), ('card_only', 'AMCR', 'MAT-05'), ('card_only', 'APD', 'MAT-03'), ('card_only', 'JBHT', 'IND-06'), ('card_only', 'DD', 'MAT-03'), ('card_only', 'OXY', 'ENE-01'), ('node_only', 'FORM', 'ITC-03'), ('node_only', 'GS', 'FIN-02'), ('card_only', '011200.KS', 'IND-07'), ('card_only', 'LYB', 'MAT-03'), ('card_only', 'ABBNY', 'IND-04'), ('card_only', 'SHW', 'MAT-03'), ('card_only', 'TGT? ', 'IND-01'), ('card_only', 'COP', 'ENE-01'), ('card_only', 'PKX', 'MAT-01'), ('card_only', 'DOW', 'MAT-03'), ('card_only', 'IP', 'MAT-05'), ('card_only', 'WCN', 'UTL-04'), ('card_only', 'MT', 'MAT-01'), ('card_only', 'VMC', 'MAT-04'), ('card_only', '005930.KS', 'ITC-05'), ('card_only', 'UPS', 'IND-08'), ('node_only', 'BE', 'RLE-02'), ('card_only', 'ADYEY', 'ITC-08'), ('card_only', 'SMNEY', 'IND-03'), ('card_only', 'STLD', 'MAT-01'), ('card_only', 'CVX', 'ENE-01'), ('card_only', 'XBI', 'HLT-02'), ('card_only', 'EXP', 'MAT-04'), ('card_only', 'LIN', 'MAT-03'), ('card_only', 'LIN', 'ITC-04'), ('card_only', 'TIGO', 'COM-01'), ('card_only', 'AMR', 'ENE-05'), ('card_only', 'CP', 'IND-06'), ('card_only', 'HCC', 'ENE-05'), ('card_only', 'SLB', 'ENE-01'), ('card_only', 'SW', 'MAT-05'), ('node_only', 'VELO', 'IND-02'), ('card_only', 'MLM', 'MAT-04'), ('card_only', 'AIT', 'IND-09'), ('card_only', 'NUE', 'MAT-01'), ('card_only', 'SHECY', 'ITC-04'), ('card_only', 'EOG', 'ENE-01'), ('card_only', 'BKR', 'ENE-01'), ('card_only', '7974.T', 'COM-04'), ('card_only', 'CCK', 'MAT-05'), ('card_only', 'HAL', 'ENE-01'), ('card_only', 'BALL', 'MAT-05'), ('card_only', 'IBIDF', 'ITC-04'), ('card_only', 'MAERSK.CO', 'IND-07'), ('card_only', 'NTES', 'COM-04'), ('card_only', 'VRT', 'ITC-06'), ('card_only', 'XOM', 'ENE-01'), ('node_only', 'MS', 'FIN-02'), ('node_only', 'TDW', 'ENE-01'), ('card_only', 'ADTTF', 'ITC-03'), ('card_only', 'FANUY', 'IND-04'), ('card_only', 'LUV', 'IND-08'), ('card_only', 'CNR', 'ENE-05'), ('card_only', 'CE', 'MAT-03')}

def select_update_refs(pack):
    md = pack.get('monthly_diff', {})
    refs = md.get('current_update_refs')
    if 'current_update_refs' not in md:
        return {role: {'status': 'DATED_RETAINED' if key in md else 'NOT_RUN',
                       'record_key': key if key in md else None,
                       'record': md.get(key)} for role, key in UPDATE_ROLES.items()}
    require(isinstance(refs, dict) and type(refs.get('schema_version')) is int and refs['schema_version'] == 1 and
            set(refs) == {'schema_version', *UPDATE_ROLES}, 'INVALID_CURRENT_UPDATE_REF: roles/schema')
    result = {}
    for role, legacy in UPDATE_ROLES.items():
        ref = refs[role]
        require(isinstance(ref, dict) and set(ref) == {'status', 'record_key'} and
                ref['status'] in UPDATE_STATES, 'INVALID_CURRENT_UPDATE_REF: ' + role)
        key = ref['record_key']
        if key is None:
            require(ref['status'] in {'NOT_RUN', 'HOLD'}, 'INVALID_CURRENT_UPDATE_REF: null ' + role)
            record = None
        else:
            require(isinstance(key, str) and bool(re.fullmatch(r'[A-Za-z0-9_-]+', key)) and
                    key != 'current_update_refs' and isinstance(md.get(key), dict) and
                    ref['status'] != 'NOT_RUN', 'INVALID_CURRENT_UPDATE_REF: key ' + role)
            record = md[key]
            require(record.get('update_role') == role or (key == legacy and
                    record.get('update_role', role) == role), 'INVALID_CURRENT_UPDATE_REF: type ' + role)
        result[role] = {**ref, 'record': record}
    return result

def membership_exceptions(pack):
    nodes = {n['ticker']: set(n['industries']) for n in pack['company_nodes']}
    cards = {(c['ticker'], i['id']) for i in pack['industries'] for c in i.get('companies', [])}
    memberships = {(t, i) for t, ids in nodes.items() for i in ids}
    return {('node_only', *x) for x in memberships - cards} | {('card_only', *x) for x in cards - memberships}

def parse_time(value):
    require(isinstance(value, str), 'INVALID_TIMESTAMP')
    stamp = datetime.datetime.fromisoformat(value.replace('Z', '+00:00'))
    return stamp if stamp.tzinfo else stamp.replace(tzinfo=datetime.timezone.utc)

def changed_values(old, new, path=()):
    if old == new:
        return
    if isinstance(new, dict):
        for key, value in new.items():
            yield from changed_values(old.get(key) if isinstance(old, dict) else None, value, path + (key,))
    elif isinstance(new, list):
        for i, value in enumerate(new):
            yield from changed_values(old[i] if isinstance(old, list) and i < len(old) else None, value, path + (str(i),))
    else:
        yield path, new

def requires_run_context(previous, proposed):
    md, before = proposed.get('monthly_diff', {}), previous.get('monthly_diff', {})
    return ('current_update_refs' in md or proposed.get('meta', {}).get('run_kind') == 'weekly' or
            any(key.startswith('weekly_') and value != before.get(key) for key, value in md.items()))

def validate_run_context(context, previous, proposed, active_bytes, mode, replay=False):
    if context is None:
        require(not requires_run_context(previous, proposed), 'RUN_CONTEXT_REQUIRED')
        return
    require(isinstance(context, dict) and context.get('schema_version') == 1, 'INVALID_RUN_CONTEXT')
    require(mode in ('A', 'B'), 'RUN_CONTEXT_MODE_REQUIRED')
    require(context.get('kind') in {'weekly', 'manual'} and isinstance(context.get('run_key'), str)
            and 0 < len(context['run_key']) <= 240, 'INVALID_RUN_CONTEXT_ID')
    require(re.fullmatch(r'[0-9a-f]{40}', str(context.get('base_main', ''))), 'INVALID_BASE_MAIN')
    require(replay or context.get('base_active_pack_raw_sha256') == hashlib.sha256(active_bytes).hexdigest(), 'RUN_CONTEXT_BASE_MISMATCH')
    require(context.get('rules_sha256') == {f: hashlib.sha256((ROOT/f).read_bytes()).hexdigest() for f in RULES}, 'RUN_CONTEXT_RULES_MISMATCH')
    require(parse_time(context['business_cutoff_utc']).tzinfo is not None, 'INVALID_CUTOFF')
    universe = context.get('base_universe', {})
    require(replay or universe == {'companies': [n['ticker'] for n in previous['company_nodes']],
                         'industries': [i['id'] for i in previous['industries']]}, 'RUN_CONTEXT_UNIVERSE_MISMATCH')
    require(not (set(context) & {'stage_status', 'final_pack_sha256', 'commit', 'deployment', 'delivery'}), 'RUN_CONTEXT_IS_INPUT_ONLY')
    if any(key.startswith('weekly_') and value != previous.get('monthly_diff', {}).get(key)
           for key, value in proposed.get('monthly_diff', {}).items()):
        require('current_update_refs' in proposed.get('monthly_diff', {}), 'WEEKLY_UPDATE_REFS_REQUIRED')
    for role, ref in select_update_refs(proposed).items():
        if ref['record_key'] is not None and 'current_update_refs' in proposed.get('monthly_diff', {}):
            require(context.get('role_keys', {}).get(role) == ref['record_key'], 'RUN_CONTEXT_ROLE_MISMATCH')

@contextmanager
def active_lock(path):
    # Stable inode: never unlink the lock. Different run keys use this same lock.
    lock_path = path.with_name('.' + path.name + '.lock')
    with lock_path.open('a+b') as handle:
        try:
            fcntl.flock(handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise ValueError('ACTIVE_UPDATE_BUSY: ' + str(path)) from None
        try:
            yield
        finally:
            fcntl.flock(handle.fileno(), fcntl.LOCK_UN)

def economic_projection(pack):
    """Unlike reader bindings, this projection intentionally excludes price data."""
    def nonprice(value):
        if isinstance(value, dict):
            return {k:nonprice(v) for k,v in value.items() if k not in {'price_refresh','price_status','mode_b_price_coverage'}}
        if isinstance(value, list):return [nonprice(v) for v in value]
        return value
    return {'industries': pack['industries'], 'edges': pack['edges'],
            'company_nodes': [{k:v for k,v in n.items() if k not in {'stance_state', 'price_comparison_review'}}
                              for n in pack['company_nodes']],
            'monthly_diff': nonprice(pack.get('monthly_diff', {}))}

def validate_source_dates(previous, proposed, cutoff):
    """Check newly changed observations, not forecast targets or exact retained source records."""
    keys = {'publication_date','published_on','source_date','observation_date','published','release_date'}
    retained = set()
    def collect(value):
        if isinstance(value, dict):
            if ('url' in value or 'source' in value) and (set(value) & (keys | {'as_of'})):
                retained.add(sha(value))
            for v in value.values():collect(v)
        elif isinstance(value,list):
            for v in value:collect(v)
    collect(core(previous))
    def visit(old,new,path=()):
        if old == new or (isinstance(new,dict) and ('url' in new or 'source' in new) and sha(new) in retained):return
        if isinstance(new,dict):
            for key,value in new.items():visit(old.get(key) if isinstance(old,dict) else None,value,path+(key,))
        elif isinstance(new,list):
            for i,value in enumerate(new):visit(old[i] if isinstance(old,list) and i<len(old) else None,value,path+(str(i),))
        elif path and 'stance_state' not in path and new:
            date_key = path[-1] in keys or (path[-1]=='as_of' and any(x in path for x in
                ('leading_indicators','source_records','public_sources','sources','deep_dive_ref')))
            if date_key and isinstance(new,str):
                match=re.match(r'^(\d{4}-\d{2}(?:-\d{2})?)(?=$|[ T(])',new)
                if match:
                    day=match[1]+'-01' if len(match[1])==7 else match[1]
                    require(cutoff is not None, 'SOURCE_CUTOFF_REQUIRED')
                    try:observed=parse_time(new)
                    except ValueError:observed=parse_time(day)
                    require(observed<=parse_time(cutoff),'SOURCE_AFTER_CUTOFF: '+'.'.join(path))
    visit(core(previous),core(proposed))

def validate_propagation(record, proposed, industry):
    require(isinstance(record,dict), 'PROPAGATION_TRACE_OR_DEBT_REQUIRED')
    if record.get('debt'):
        require(record.get('reason') and record.get('next_check'), 'PROPAGATION_DEBT_SCOPE_REQUIRED')
        return
    traces=record.get('paths',[record] if 'path' in record else [])
    require(isinstance(traces,list) and traces, 'PROPAGATION_TRACE_OR_DEBT_REQUIRED')
    edges=proposed.get('edges',[])
    for trace in traces:
        path=trace.get('path',[])
        require(isinstance(path,list) and 2<=len(path)<=3 and trace.get('hops',len(path)-1)==len(path)-1,
                'PROPAGATION_MAX_TWO_HOPS')
        require(path[0]==industry and trace.get('assessment') and trace.get('reason') and trace.get('next_check'),
                'PROPAGATION_REVIEW_SCOPE_REQUIRED')
        for a,z in zip(path,path[1:]):
            require(any(e['from']==a and e['to']==z for e in edges), 'PROPAGATION_UNREGISTERED_PATH')

def mechanical_zone(node, value):
    """Compare already admitted rungs only; never create or interpolate bands."""
    contract = node.get('deep_dive_ref', {}).get('atlas_stance', {})
    ladder = contract.get('ladder', [])
    if contract.get('label') == 'UNKNOWN' or not ladder:
        return 'UNKNOWN', None
    matches = []
    for rung in ladder:
        lo, hi, src = rung.get('lo'), rung.get('hi'), str(rung.get('src', ''))
        inside = (lo is None or value >= lo) and (hi is None or value <= hi)
        if lo == value and (re.search(r'(?<![<>=])>\s*' + re.escape(str(lo).removesuffix('.0')), src) or re.search(r'(?i)above|over', src)):
            inside = False
        if hi == value and (re.search(r'(?<![<>=])<\s*' + re.escape(str(hi).removesuffix('.0')), src) or re.search(r'(?i)below|under', src)):
            inside = False
        if inside:
            matches.append(rung)
    if not matches or (len(matches) > 1 and any(x['hi'] != y['lo'] for x,y in zip(matches, matches[1:]))
                       and len({x['tier'] for x in matches}) > 1):
        return 'UNKNOWN', None
    zone = matches[0]['tier']
    if zone == 'UNKNOWN':
        return zone, None
    uppers = [x.get('hi') for x in ladder if x.get('tier') == 'ATTRACTIVE' and
              isinstance(x.get('hi'), (int,float)) and not isinstance(x['hi'], bool) and x['hi'] > 0]
    return zone, (value / max(uppers) - 1) * 100 if uppers else None

def validate_domain_delta(previous, proposed, context=None, evidence=None):
    """Mechanical guard only. Actual source/independence/economic review remains external."""
    evidence = evidence or {}
    nodes = {n['ticker']: n for n in proposed['company_nodes']}
    oldnodes = {n['ticker']: n for n in previous['company_nodes']}
    oldinds = {i['id']: i for i in previous['industries']}
    cutoff = (context or {}).get('business_cutoff_utc')
    if not cutoff:
        selected = select_update_refs(proposed)['business']['record'] or {}
        cutoff = selected.get('research_cutoff_utc')
    validate_source_dates(previous,proposed,cutoff)
    require(membership_exceptions(proposed) <= membership_exceptions(previous), 'MEMBERSHIP_EXCEPTION_REGRESSION')
    for ticker, node in nodes.items():
        old = oldnodes.get(ticker)
        if old and node.get('deep_dive_ref') != old.get('deep_dive_ref'):
            # Updated business prose within a DD still needs explicit source-bound review.
            admission = evidence.get('dd_admissions', {}).get(ticker, {})
            require(admission.get('previous_sha256') == sha(old.get('deep_dive_ref')) and
                    admission.get('proposed_sha256') == sha(node.get('deep_dive_ref')) and
                    admission.get('same_issuer') is True and admission.get('source_version') and
                    HEX.fullmatch(str(admission.get('source_sha256',''))) and admission.get('original_rules_reviewed') is True,
                    'DD_CHANGE_REQUIRES_SOURCE_ADMISSION: ' + ticker)
        if not old and node.get('deep_dive_ref'):
            admission = evidence.get('dd_admissions', {}).get(ticker, {})
            require(admission.get('proposed_sha256') == sha(node['deep_dive_ref']) and admission.get('source_version')
                    and HEX.fullmatch(str(admission.get('source_sha256',''))) and admission.get('original_rules_reviewed') is True,
                    'NEW_DD_REQUIRES_SOURCE_ADMISSION: ' + ticker)
        state, prior = node.get('stance_state'), (old or {}).get('stance_state')
        if state and state != prior:
            quote = state.get('price', {})
            if not quote_errors(quote):
                observation_cutoff = (context or {}).get('observation_cutoff_utc')
                require(parse_time(quote['as_of']) <= (parse_time(observation_cutoff) if observation_cutoff else datetime.datetime.now(datetime.timezone.utc)), 'FUTURE_QUOTE_OBSERVATION')
                oldquote = (prior or {}).get('price', {})
                if not quote_errors(oldquote):
                    require(parse_time(quote['as_of'])>=parse_time(oldquote['as_of']), 'OLDER_QUOTE_NOT_ADOPTED')
                changed_identity = any(quote.get(k) != oldquote.get(k) for k in ('listing','currency','unit'))
                if changed_identity:
                    mapping = evidence.get('security_mappings', {}).get(ticker, {})
                    require(mapping.get('previous') == {k:oldquote.get(k) for k in ('listing','currency','unit')} and
                            mapping.get('proposed') == {k:quote.get(k) for k in ('listing','currency','unit')} and
                            mapping.get('same_security') is True and mapping.get('public_source'),
                            'SECURITY_IDENTITY_REVIEW_REQUIRED: ' + ticker)
                if state.get('zone') != 'UNKNOWN':
                    basis = state.get('comparison_basis') or {}
                    band_currency = node.get('deep_dive_ref', {}).get('atlas_stance', {}).get('currency')
                    require(not band_currency or band_currency == quote.get('currency'), 'BAND_CURRENCY_COMPARISON_REQUIRES_HOLD')
                    require(node.get('price_comparison_review', {}).get('comparison_eligible') is True,
                            'PRICE_COMPARISON_NOT_ELIGIBLE: ' + ticker)
                    require(basis.get('value') == quote.get('value') and basis.get('currency') == quote.get('currency') and
                            basis.get('unit') == quote.get('unit'), 'FX_OR_RATIO_COMPARISON_REQUIRES_HOLD: ' + ticker)
                    zone, gap = mechanical_zone(node, quote['value'])
                    actual = state.get('gap_to_attractive_pct')
                    require(state.get('zone') == zone and ((gap is None and actual is None) or
                            isinstance(actual, (int,float)) and not isinstance(actual,bool) and gap is not None and
                            math.isclose(actual,gap,rel_tol=1e-9,abs_tol=1e-9)), 'PRICE_BAND_BOUNDARY_MISMATCH: ' + ticker)
            if state.get('zone') == 'UNKNOWN':
                require(state.get('gap_to_attractive_pct') is None, 'UNKNOWN_GAP_MUST_BE_NULL')
    for industry in proposed['industries']:
        old = oldinds.get(industry['id'])
        if not old:
            continue
        changed = [f for f in ('tier','balance','cycle_stage') if industry.get(f) != old.get(f)]
        if changed:
            review = evidence.get('state_reviews', {}).get(industry['id'], {})
            require(review.get('previous_sha256') == sha({f:old.get(f) for f in changed}) and
                    review.get('proposed_sha256') == sha({f:industry.get(f) for f in changed}) and
                    review.get('counterevidence') and review.get('propagation'), 'STATE_REVIEW_REQUIRED: ' + industry['id'])
            validate_propagation(review['propagation'],proposed,industry['id'])
            if 'tier' in changed:
                signals = review.get('signals', [])
                require(len(signals) >= 2 and len({x.get('event_id') for x in signals}) == len(signals) and
                        all(x.get('event_id') and x.get('source') and x.get('tag') in {'ACTUAL','INDEPENDENTLY_VERIFIED'} and
                            x.get('trigger') in {'D1','D2','D3','D4','S1','S2','S3','S4','P1','P2'} for x in signals) and
                        review.get('independence_reviewed') is True, 'TIER_TWO_INDEPENDENT_SIGNALS_REQUIRED')
                require(industry.get('tier_history') != old.get('tier_history'), 'TIER_HISTORY_REQUIRED')
    if (context or {}).get('price_only') is True:
        require(economic_projection(previous) == economic_projection(proposed), 'PRICE_FIREWALL_VIOLATION')
    if context and context.get('kind') == 'weekly':
        selected = select_update_refs(proposed)['business']
        if selected['status'] == 'REVIEWED_SCOPED':
            record = selected['record']
            for field, identity, expected in [('company_coverage','ticker',set(nodes)),
                                              ('industry_coverage','industry',{i['id'] for i in proposed['industries']})]:
                rows = record.get(field, [])
                require(len(rows) == len(expected) and {x.get(identity) for x in rows} == expected, 'COVERAGE_UNIVERSE_MISMATCH')
                for row in rows:
                    require(row.get('status') in {'changed','checked-no-material-change','stale','unavailable','follow-up'}, 'INVALID_COVERAGE_STATUS')
                    require(row.get('search_performed') is True or row.get('status') in {'stale','unavailable','follow-up'}, 'UNSEARCHED_IS_NOT_NO_CHANGE')
                    require(row.get('current_full_verification') is False, 'COVERAGE_IS_NOT_FULL_OPERATIONS')
                    require(row.get('next_check_ko') or row.get('next_check'), 'COVERAGE_NEXT_CHECK_REQUIRED')
                    require(row.get('business_note_ko') or row.get('demand_note_ko') or row.get('reason') or
                            row.get('status_reason_ko'), 'COVERAGE_REASON_REQUIRED')
                    if row['status'] in {'changed','checked-no-material-change'}:
                        sources=row.get('sources',[])
                        require(isinstance(sources,list) and sources, 'COVERAGE_SOURCE_SCOPE_REQUIRED')
                        for source in sources:
                            require(isinstance(source,dict) and source.get('url') and
                                    (source.get('read_depth') or source.get('read_scope') or source.get('read_scope_ko')) and
                                    (source.get('measurement_period') or source.get('period')), 'COVERAGE_SOURCE_SCOPE_REQUIRED')

def leaves(v):
    if isinstance(v,str): yield 's:'+v
    elif v is None: yield 'null'
    elif isinstance(v,bool): yield 'b:'+str(v).lower()
    elif isinstance(v,(int,float)): yield 'n:'+struct.pack('>d',v).hex()
    elif isinstance(v,list):
        for x in v: yield from leaves(x)
    elif isinstance(v,dict):
        for k in sorted(v):
            yield 'k:'+k
            yield from leaves(v[k])

def fingerprint(v):
    h=2166136261
    for b in '\0'.join(leaves(v)).encode(): h=((h^b)*16777619)&0xffffffff
    return format(h,'08x')

def quote_errors(p):
    if not isinstance(p,dict): return ['quote_missing']
    bad=[];v=p.get('value')
    if isinstance(v,bool) or not isinstance(v,(int,float)) or not math.isfinite(v) or v<=0: bad.append('value_invalid')
    date=p.get('as_of')
    try:
        require(isinstance(date,str) and bool(re.fullmatch(r'\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?',date)),'as_of')
        datetime.datetime.fromisoformat(date.replace('Z','+00:00'))
    except (ValueError,TypeError): bad.append('as_of_invalid')
    try:
        u=urlsplit(p.get('source',''))
        if u.scheme not in ('http','https') or not u.hostname or u.username or u.password: bad.append('source_invalid')
    except (ValueError,TypeError): bad.append('source_invalid')
    c=p.get('currency');unit=p.get('unit')
    if not isinstance(c,str) or not re.fullmatch(r'[A-Z]{3}',c): bad.append('currency_invalid')
    if not isinstance(unit,str) or not re.fullmatch(r'[A-Z]{3}_per_[A-Za-z_]+',unit) or not unit.startswith(str(c)+'_per_'): bad.append('unit_invalid')
    if not isinstance(p.get('listing'),str) or not re.fullmatch(r'[A-Za-z0-9._-]+:[A-Za-z0-9._^-]+',p['listing']):bad.append('listing_missing_or_invalid')
    raw=p.get('raw_value');factor=p.get('normalization_factor');rc=p.get('raw_currency')
    if any(k in p for k in ('raw_value','raw_currency','normalization_factor')):
        valid=isinstance(raw,(int,float)) and not isinstance(raw,bool) and math.isfinite(raw) and raw>0 and isinstance(factor,(int,float)) and not isinstance(factor,bool) and math.isfinite(factor) and factor>0
        if not valid or (isinstance(v,(int,float)) and not isinstance(v,bool) and math.isfinite(v) and not math.isclose(v,raw*factor,rel_tol=1e-10,abs_tol=1e-10)):bad.append('raw_value_or_factor_mismatch')
        # Preserve the existing ILA minor-unit contract; do not infer new FX conversions.
        if rc!=c and not (rc=='ILA' and c=='ILS' and factor==0.01 and p.get('raw_unit')=='ILA_per_share' and unit=='ILS_per_share'):bad.append('raw_currency_mismatch')
    return bad

def normalize_prices(pack,previous):
    old={n['ticker']:n for n in previous['company_nodes']}
    for n in pack['company_nodes']:
        s=n.get('stance_state')
        if not s: continue
        prior=old.get(n['ticker'],{}).get('stance_state',{})
        history=copy.deepcopy(prior.get('price_observation_history',[]))
        for entry in s.get('price_observation_history',[]):
            if entry not in history:history.append(copy.deepcopy(entry))
        if history:s['price_observation_history']=history
        bad=quote_errors(s.get('price'))
        review=n.get('price_comparison_review',{})
        if n.get('deep_dive_ref', {}).get('atlas_stance', {}).get('label') == 'UNKNOWN' and (s.get('zone') != 'UNKNOWN' or s.get('gap_to_attractive_pct') is not None):bad.append('source_contract_label_unknown')
        if review.get('comparison_eligible') is False and (s.get('zone')!='UNKNOWN' or s.get('gap_to_attractive_pct') is not None):bad.append('comparison_not_eligible')
        if not bad: continue
        if prior and not quote_errors(prior.get('price')):
            keys=['price','zone','gap_to_attractive_pct','comparison_basis','freshness','tripwire_status',
                  'display_suppressed','stance_refreshed_at','refresh_status']
            entry={'kind':'HISTORICAL_LAST_GOOD_OBSERVATION',**{k:copy.deepcopy(prior[k]) for k in keys if k in prior}}
            if entry not in history: history.append(entry)
        if history: s['price_observation_history']=history
        s.update(zone='UNKNOWN',gap_to_attractive_pct=None,display_suppressed=True,
                 price_validation_status='INVALID_CURRENT_QUOTE',price_validation_reasons=bad)
        s['comparison_basis']=None

def validate_inputs(pack,reader):
    require(reader.get('reading_only') is True and reader.get('all_355_current_operations_verified') is False,'reader scope flags')
    nodes={n['ticker']:n for n in pack['company_nodes']};inds={i['id']:i for i in pack['industries']}
    require(len(nodes)==len(pack['company_nodes']) and len(inds)==len(pack['industries']),'duplicate identity')
    require(all(i.get('tier') in ('HEAT','WARM','NEUTRAL','COLD','FROZEN') for i in inds.values()),'invalid tier enum')
    require(all(set(n['industries'])<=inds.keys() for n in nodes.values()),'missing industry')
    require(all(len(n['industries']) == len(set(n['industries'])) for n in nodes.values()), 'DUPLICATE_COMPANY_MEMBERSHIP')
    themes = {t['id'] for t in pack.get('themes', [])}
    require(len(themes) == len(pack.get('themes', [])) and not themes & inds.keys(), 'DUPLICATE_NODE_IDENTITY')
    endpoints = set(inds) | themes | set(nodes) | {'C::' + t for t in nodes}
    seen = set()
    types = {'SUPPLIES_TO','CUSTOMER_OF','SUBSTITUTES','CAPACITY_COMPETES','DEMAND_COMOVES',
             'INVERSE','THEME_DRIVES','OPERATES_IN','COMPETES_WITH','KEY_SUPPLIER_OF','KEY_CUSTOMER_OF'}
    for edge in pack.get('edges', []):
        require(edge.get('from') in endpoints and edge.get('to') in endpoints, 'UNKNOWN_EDGE_ENDPOINT')
        key = (edge['from'],edge['to'],edge.get('type'))
        require(key not in seen, 'DUPLICATE_EDGE'); seen.add(key)
        require(edge.get('type') in types and edge.get('direction') in {'+','-','−','both','양면'} and
                edge.get('strength') in {'H','M','L'} and isinstance(edge.get('mechanism'),str) and
                edge['mechanism'].strip() and edge.get('lag'), 'INVALID_EDGE_CONTRACT')
    require(membership_exceptions(pack) <= LEGACY_MEMBERSHIP_EXCEPTIONS, 'NEW_MEMBERSHIP_MISMATCH')
    require(sum(i['tier'] == 'HEAT' for i in inds.values()) <= math.floor(.15 * len(inds)), 'HEAT_LIMIT_EXCEEDED')
    require(all(len(i.get('leading_indicators', [])) >= 2 and i.get('market_read') and
                (i['tier'] != 'COLD' or i.get('cold_reversal_signal')) for i in inds.values()), 'INDUSTRY_CARD_REQUIRED_FIELDS')
    require(all('heat_score' not in i for i in inds.values()), 'PERSISTENT_HEAT_SCORE_FORBIDDEN')
    candidates = pack.get('monthly_diff', {}).get('deep_dive_candidates', [])
    candidate_keys = set()
    for candidate in candidates:
        ticker = candidate.get('ticker') or candidate.get('company_ticker')
        key = (ticker,candidate.get('type'))
        require(key not in candidate_keys, 'DUPLICATE_CANDIDATE'); candidate_keys.add(key)
        require(ticker in nodes and candidate.get('industry') in inds and
                candidate.get('type') in {'NEW','REVISIT'} and
                candidate.get('status') in {'OPEN','PENDING_TRIGGER','RESOLVED','EXPIRED'} and
                candidate.get('falsifier') and candidate.get('horizon'), 'INVALID_CANDIDATE_CONTRACT')
        if candidate['type'] == 'NEW' and candidate['status'] in {'OPEN','PENDING_TRIGGER'}:
            require(nodes[ticker].get('verification') == 'SHALLOW', 'NEW_CANDIDATE_REQUIRES_SHALLOW')
            require(candidate.get('bucket'), 'NEW_CANDIDATE_BUCKET_REQUIRED')
        if candidate['type'] == 'REVISIT':
            require(isinstance(candidate.get('trigger'),dict) and candidate['trigger'].get('kind') in
                    {'TRIPWIRE','TIER_CHANGE','BALANCE_CHANGE','THESIS_STALE'}, 'INVALID_REVISIT_TRIGGER')
            require(candidate['trigger'].get('evidence') or candidate['trigger'].get('detail'), 'REVISIT_OBSERVATION_EVIDENCE_REQUIRED')
    require(sum(c['type']=='REVISIT' and c['status']=='OPEN' for c in candidates) <= 5, 'REVISIT_OPEN_LIMIT')
    select_update_refs(pack)
    require(set(reader['company_research'])<=nodes.keys() and set(reader.get('company_roles',{}))<=nodes.keys(),'reader identity')
    for records in reader['company_research'].values():
        for r in records:
            require(r.get('facts_ko') and r.get('limits_ko') and r.get('read_scope') and r.get('public_sources'),'research scope/source missing')
            require(r.get('current_full_verification') is False,'research verification flag')
            require(isinstance(r.get('source_sha256'),list) and r['source_sha256'] and all(isinstance(h,str) and HEX.fullmatch(h) for h in r['source_sha256']),'invalid source hash')
    for r in reader.get('company_roles',{}).values():
        require(r.get('role_ko') and r.get('read_scope') and r.get('provenance'),'role scope missing')
    for r in [*reader.get('editorial',{}).values(),*reader.get('company_roles',{}).values()]:
        if 'source_record_sha256' in r: require(bool(HEX.fullmatch(str(r['source_record_sha256']))),'invalid legacy record hash')

def record_bindings(pack,reader):
    nodes={n['ticker']:n for n in pack['company_nodes']};inds={i['id']:i for i in pack['industries']}
    md=pack.get('monthly_diff',{});out={}
    selected=select_update_refs(pack)
    selected_hashes={role:{'status':ref['status'],'record_key':ref['record_key'],
        'record_sha256':sha(ref['record']) if ref['record'] is not None else None}
        for role,ref in selected.items()} if 'current_update_refs' in md else None
    def context(key):
        # Full nodes include quote references: a price-only review never resets business freshness.
        ids=set(nodes[key]['industries']) if key in nodes else {key}
        c=selected['judgment']['record'] or {}
        related={'candidates':[x for x in md.get('deep_dive_candidates',[]) if (x.get('ticker') or x.get('company_ticker'))==key],
                 'closed_judgments':[x for x in c.get('closed_judgments',[]) if x.get('industry') in ids or any(key in r.get('tickers',[]) for r in x.get('company_reviews',[]))],
                 'industry_dispositions':[x for x in c.get('industry_dispositions',[]) if x.get('industry') in ids]}
        if key=='UBER':related['conditional_evaluation']=c.get('conditional_UBER_evaluation')
        if 'current_update_refs' in md:
            related['selected_updates']=selected_hashes
            related['edge_reviews']=[e for e in pack.get('edges',[]) if e['from'] in ids or e['to'] in ids or e['from'] in {key,'C::'+key} or e['to'] in {key,'C::'+key}]
        if key in nodes:
            n=nodes[key]
            return {'node':n,'industries':[inds[i] for i in n['industries']],'related_judgments':related}
        require(key in inds,'unknown editorial identity: '+key)
        return {'industry':inds[key],'related_judgments':related}
    def bind(key,inp,value):out[key]={'input_sha256':sha(inp),'summary_sha256':sha(value)}
    for key,value in reader.get('editorial',{}).items():bind('editorial:'+key,context(key),value)
    for key,value in reader.get('company_roles',{}).items():bind('role:'+key,context(key),value)
    for key,value in reader['company_research'].items():bind('research:'+key,context(key),value)
    for key,value in reader['translations'].items():bind('translation:'+key,key,value)
    meta={k:v for k,v in reader.items() if k not in ('pack_sha256','pack_semantic_fingerprint','pack_hash_scheme','editorial','company_roles','company_research','translations')}
    bind('reader_metadata','reader_metadata',meta)
    return out

def validate_pair(pack):
    p=pack.get(PAIR);require(isinstance(p,dict),'active pair missing')
    require(p.get('schema_version')==1 and p.get('content_hash_scheme')==SCHEME,'active pair scheme')
    require(p.get('pair_semantic_fingerprint')==fingerprint({k:v for k,v in p.items() if k!='pair_semantic_fingerprint'}),'active pair metadata fingerprint')
    c=core(pack);r=p['reader']
    require(p['pack_content_sha256']==sha(c) and r['pack_sha256']==sha(c),'active pair PACK hash')
    require(p['reader_content_sha256']==sha(r) and r['pack_semantic_fingerprint']==fingerprint(c),'active pair reader hash')
    require(p.get('reader_semantic_fingerprint')==fingerprint(r),'active reader fingerprint')
    validate_inputs(c,r);bindings=record_bindings(c,r)
    require(set(bindings)==set(p['record_bindings']),'active binding membership')
    for key,value in bindings.items():
        require(all(p['record_bindings'][key].get(k)==v for k,v in value.items()),'active binding mismatch: '+key)
        review=p['record_bindings'][key].get('review',{})
        if review.get('status')=='RETAINED_5G_BASELINE_UNVERIFIED':
            require(set(review)=={'status','current_operations_verified'} and review['current_operations_verified'] is False,'invalid baseline review status')
        else:
            fields={'review_id','reviewer_role','reviewed_at_utc','decision','evidence_sha256','current_operations_verified'}
            require(set(review)==fields and review['current_operations_verified'] is False and review['reviewer_role'] in ('independent_reviewer','designated_reviewer') and review['decision'] in ('REVISED','RETAIN_DATED'),'active review metadata invalid')
            require(bool(HEX.fullmatch(str(review['evidence_sha256']))) and bool(re.fullmatch(r'[A-Za-z0-9_.:-]{1,100}',str(review['review_id']))),'active review digest/id invalid')
            require(datetime.datetime.fromisoformat(review['reviewed_at_utc'].replace('Z','+00:00')).tzinfo is not None,'active review time invalid')
            require(any(x.get('record_id')==key and all(x.get(k)==v for k,v in value.items()) and all(x.get(k)==v for k,v in review.items()) for x in p.get('change_receipts',[])),'active review receipt missing')
    return c,r,p['record_bindings']

def anchor(active_path):
    raw=active_path.read_bytes();active=load(active_path)
    if PAIR in active:return validate_pair(active)
    require(hashlib.sha256(raw).hexdigest()==BASE_PACK,'legacy fallback requires exact 5G PACK anchor')
    source=ROOT/'data/ATLAS_READER.json'
    require(hashlib.sha256(source.read_bytes()).hexdigest()==BASE_READER,'legacy reader anchor changed; no automatic bootstrap')
    r=load(source);validate_inputs(active,r);b=record_bindings(active,r)
    for x in b.values():x['review']={'status':'RETAINED_5G_BASELINE_UNVERIFIED','current_operations_verified':False}
    return active,r,b

def review_changes(old,new,receipts,path):
    required=[];result={};by_key={};used=[]
    for receipt in receipts:
        require(receipt.get('record_id') not in by_key,'duplicate review receipt')
        by_key[receipt.get('record_id')]=receipt
    for key in sorted(set(old)|set(new)):
        a=old.get(key);b=new.get(key)
        if a and b and all(a[k]==b[k] for k in ('input_sha256','summary_sha256')):
            result[key]={**b,'review':a['review']};continue
        expected={'record_id':key,'previous_input_sha256':a['input_sha256'] if a else None,
                  'previous_summary_sha256':a['summary_sha256'] if a else None,
                  'input_sha256':b['input_sha256'] if b else None,'summary_sha256':b['summary_sha256'] if b else None}
        r=by_key.get(key)
        if not r:required.append(expected);continue
        require(all(r.get(k)==v for k,v in expected.items()),'review digest mismatch: '+key)
        require(r.get('decision') in ('REVISED','RETAIN_DATED','REMOVE') and bool(r.get('reason')),'review decision/reason missing')
        require((b is None)==(r['decision']=='REMOVE'),'review removal mismatch')
        require(bool(r.get('reviewer_role')) and bool(r.get('review_id')) and bool(r.get('reviewed_at_utc')),'reviewer/time missing')
        require(r['reviewer_role'] in ('independent_reviewer','designated_reviewer') and bool(re.fullmatch(r'[A-Za-z0-9_.:-]{1,100}',r['review_id'])),'reviewer role/id format')
        require(datetime.datetime.fromisoformat(r['reviewed_at_utc'].replace('Z','+00:00')).tzinfo is not None,'review UTC offset missing')
        require(r.get('current_operations_verified') is False,'reader review is not full operations verification')
        evidence=Path(r.get('evidence_file',''))
        if not evidence.is_absolute():evidence=path.parent/evidence
        require(evidence.is_file() and HEX.fullmatch(str(r.get('evidence_sha256',''))) and hashlib.sha256(evidence.read_bytes()).hexdigest()==r['evidence_sha256'],'review evidence missing/hash mismatch')
        # Public pair never receives private evidence paths, accounts or source text.
        public={k:r[k] for k in ('review_id','reviewer_role','reviewed_at_utc','decision','evidence_sha256','current_operations_verified')}
        used.append({**expected,**public})
        if b:result[key]={**b,'review':public}
    require(set(by_key)<=set(old)|set(new),'unknown review scope')
    return result,required,used

def atomic_activate(path,payload):
    fd,name=tempfile.mkstemp(prefix='.atlas-pair-',suffix='.tmp',dir=path.parent)
    try:
        with os.fdopen(fd,'wb') as f:f.write(payload);f.flush();os.fsync(f.fileno())
        os.replace(name,path)  # single activation commit point
    finally:
        if os.path.exists(name):os.unlink(name)

def update_target(old, incoming, normalized, reader, mode, diff, history, run_context_sha256=None, change_evidence_sha256=None, access_binding=None):
    """Bind an actual external UPDATE review; never perform its economic judgment."""
    same=sha(old)==sha(normalized)
    previous=next((x['binding'] for x in reversed(history)
                   if x['binding']['normalized_pack_content_sha256']==sha(old)),None)
    # Plain active no-op claims no new UPDATE review. Explicit replay must retain its sidecars.
    if same and not run_context_sha256 and not change_evidence_sha256 and (not previous or (mode is None and diff is None)):return None
    require(mode in ('A','B'), 'changed PACK requires --mode A or B (original UPDATE scope)')
    require(diff is not None and diff.is_file(), 'changed PACK requires original UPDATE --diff report')
    target={'mode':mode, 'previous_pack_content_sha256':sha(old),
            'proposed_pack_content_sha256':sha(incoming),
            'normalized_pack_content_sha256':sha(normalized),
            'proposed_reader_content_sha256':sha(reader),
            'diff_sha256':hashlib.sha256(diff.read_bytes()).hexdigest(),
            'rules_sha256':{name:hashlib.sha256((ROOT/name).read_bytes()).hexdigest() for name in RULES}}
    if run_context_sha256:target['run_context_sha256']=run_context_sha256
    if change_evidence_sha256:target['change_evidence_sha256']=change_evidence_sha256
    if access_binding:target.update(access_binding)
    if same and previous and set(target)==set(previous) and all(target[k]==previous[k] for k in target if k!='previous_pack_content_sha256'):return None
    return target

def check_update_review(target, path):
    require(path is not None, 'changed PACK requires actual independent --update-review')
    r=load(path)
    require(isinstance(r,dict), 'UPDATE review must be an object')
    require(r.get('schema_version')==1 and r.get('binding')==target, 'UPDATE review version/input/diff/rules mismatch')
    require(r.get('reviewer_role')=='independent_reviewer', 'UPDATE requires independent reviewer')
    require(isinstance(r.get('review_id'),str) and bool(re.fullmatch(r'[A-Za-z0-9_.:-]{1,100}',r['review_id'])), 'UPDATE review ID missing/invalid')
    require(datetime.datetime.fromisoformat(r.get('reviewed_at_utc','').replace('Z','+00:00')).tzinfo is not None, 'UPDATE review time missing/invalid')
    require(r.get('decision')=='ACCEPT_WITH_SCOPED_HOLDS' and bool(r.get('reason')), 'UPDATE review decision/reason missing')
    require(r.get('current_operations_verified') is False and r.get('automatic_weekly_integration_complete') is False, 'UPDATE review cannot claim full operations/automation')
    checks=r.get('checkpoints',{})
    required_checks=set(UPDATE_CHECKS)|({ACCESS_CHECK} if 'access_audit_sha256' in target else set())|({MODE_B_CHECK} if 'mode_b_evidence_sha256' in target else set())
    require(isinstance(checks,dict) and set(checks)==required_checks, 'UPDATE original-rule checkpoints missing')
    for key,c in checks.items():
        require(isinstance(c,dict) and c.get('status') in ('REVIEWED','SCOPED_HOLD','NOT_APPLICABLE') and bool(c.get('reason')), 'UPDATE checkpoint explanation missing: '+key)
    evidence=Path(r.get('evidence_file',''))
    if not evidence.is_absolute():evidence=path.parent/evidence
    require(evidence.is_file() and HEX.fullmatch(str(r.get('evidence_sha256',''))) and hashlib.sha256(evidence.read_bytes()).hexdigest()==r['evidence_sha256'], 'UPDATE review evidence missing/hash mismatch')
    # Keep only version-bound public metadata; private paths, checkpoint text and originals stay outside PACK.
    return {k:r[k] for k in ('schema_version','binding','review_id','reviewer_role','reviewed_at_utc',
                            'decision','evidence_sha256','current_operations_verified','automatic_weekly_integration_complete')}

def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--pack',type=Path,default=ROOT/'data/ATLAS_PACK.json',help='proposed PACK; do not overwrite active first')
    ap.add_argument('--reader',type=Path,help='explicit proposed reader; default is the validated active reader')
    ap.add_argument('--reviews',type=Path,help='scoped review receipts; never issued by this builder')
    ap.add_argument('--review-plan',type=Path,help='write pending record digests; no activation')
    ap.add_argument('--prepare-reader',type=Path,help='save a dated active-reader draft for proposed PACK; no approval/activation; never overwrite')
    ap.add_argument('--mode',choices=('A','B'),help='original UPDATE A (scan) or B (DD integration)')
    ap.add_argument('--diff',type=Path,help='actual original UPDATE diff report, kept outside active PACK')
    ap.add_argument('--update-review',type=Path,help='actual independent whole-UPDATE review; never issued here')
    ap.add_argument('--run-context',type=Path,help='immutable private initial run snapshot; never embedded in public PACK')
    ap.add_argument('--change-evidence',type=Path,help='immutable private post-research domain evidence; exact hash bound to UPDATE review')
    ap.add_argument('--access-history',type=Path,help='private pinned access policy with original proofs')
    ap.add_argument('--request-plan',type=Path,help='private exact targets and per-researcher request plan; no network execution')
    ap.add_argument('--prepare-research-handoff',type=Path,help='create private pre-request decisions; never approval or tool interception')
    ap.add_argument('--access-audit',type=Path,help='acknowledged pre-request handoffs plus complete actual/skipped request inventory')
    ap.add_argument('--mode-b-evidence',type=Path,help='private independent folder discovery, exact-byte comparison and version/HOLD receipts')
    args=ap.parse_args()
    with active_lock(ROOT/'data/ATLAS_PACK.json'):
        build(args)

def build(args):
    active=ROOT/'data/ATLAS_PACK.json';active_bytes=active.read_bytes()
    protected={active.resolve(),args.pack.resolve(),(ROOT/'data/ATLAS_READER.json').resolve()}
    snapshots={}
    for source in (args.pack,args.reader,args.reviews,args.update_review,args.diff,args.run_context,args.change_evidence,
                   args.access_history,args.request_plan,args.access_audit,args.mode_b_evidence):
        if source:protected.add(source.resolve())
        if source:snapshots[source.resolve()]=source.read_bytes()
    for output in (args.review_plan,args.prepare_reader,args.prepare_research_handoff):
        if output:require(output.resolve() not in protected,'draft/plan cannot overwrite inputs/active pair')
    old,oldreader,bindings=anchor(active)
    proposed=core(load(args.pack));incoming=copy.deepcopy(proposed);input_hash=sha(incoming)
    context=load(args.run_context) if args.run_context else None
    evidence=load(args.change_evidence) if args.change_evidence else None
    context_sha=hashlib.sha256(snapshots[args.run_context.resolve()]).hexdigest() if args.run_context else None
    evidence_sha=hashlib.sha256(snapshots[args.change_evidence.resolve()]).hexdigest() if args.change_evidence else None
    if args.prepare_research_handoff:
        require(args.access_history and args.request_plan and args.run_context and not any((args.reader,args.reviews,
                args.update_review,args.review_plan,args.prepare_reader,args.diff,args.access_audit,args.mode_b_evidence)), 'ACCESS_HANDOFF_ARGUMENTS_REQUIRED')
        require(input_hash==sha(old), 'ACCESS_HANDOFF_REQUIRES_CURRENT_BASE_NOT_RESEARCH_PROPOSAL')
        validate_run_context(context,old,old,active_bytes,args.mode)
        handoff=make_research_handoff(args.request_plan,args.access_history,args.run_context,snapshots)
        output=private_path(args.prepare_research_handoff)
        require(all(p.read_bytes()==v for p,v in snapshots.items()),'ACCESS_INPUT_CHANGED_DURING_HANDOFF')
        with output.open('xb') as f:f.write(canonical(handoff)+b'\n')
        print('private pre-request handoff only; actor acknowledgment required; no requests executed');return
    require(args.request_plan is None, 'ACCESS_REQUEST_PLAN_ONLY_WITH_HANDOFF')
    needs_access=(input_hash!=sha(old) or context is not None or args.review_plan is not None or args.update_review is not None)
    access_binding=validate_access_audit(args.access_audit,args.access_history,args.run_context,snapshots) if needs_access else None
    needs_mode_b=needs_access and (args.mode=='B' or (context or {}).get('kind')=='weekly')
    mode_b_binding=validate_mode_b_evidence(args.mode_b_evidence,args.run_context,snapshots) if needs_mode_b or args.mode_b_evidence else None
    if mode_b_binding:access_binding={**(access_binding or {}),**mode_b_binding}
    if context:require(args.diff is not None and args.diff.is_file(),'RUN_CONTEXT_DIFF_REQUIRED')
    replay=sha(old)==input_hash and any(x['binding'].get('run_context_sha256')==context_sha and context_sha is not None and
        x['binding']['normalized_pack_content_sha256']==sha(old) for x in load(active).get(PAIR,{}).get('update_reviews',[]))
    validate_run_context(context,old,proposed,active_bytes,args.mode,replay)
    if args.prepare_reader:
        require(not args.reader and not args.review_plan and not args.reviews and not args.update_review, 'prepare-reader is a draft-only invocation')
        reader=copy.deepcopy(oldreader);reader['pack_sha256']=input_hash;reader['pack_hash_scheme']=SCHEME
        with args.prepare_reader.open('xb') as f:f.write(canonical(reader)+b'\n')
        print('UNREVIEWED reader draft only; dated content retained; no approval; active pair unchanged');return
    reader=load(args.reader) if args.reader else copy.deepcopy(oldreader)
    legacy=((args.reader is None or hashlib.sha256(args.reader.read_bytes()).hexdigest()==BASE_READER) and input_hash==sha(old) and
            (PAIR not in load(active) or all(v['review'].get('status')=='RETAINED_5G_BASELINE_UNVERIFIED' for v in bindings.values())))
    require(reader.get('pack_sha256')==input_hash or legacy,'Reader/PACK content hash mismatch')
    normalize_prices(incoming,old);validate_inputs(incoming,reader)
    validate_domain_delta(old,incoming,context,evidence)
    target=update_target(old,proposed,incoming,reader,args.mode,args.diff,
                         load(active).get(PAIR,{}).get('update_reviews',[]),context_sha,evidence_sha,access_binding)
    receipts=load(args.reviews) if args.reviews else []
    new,pending,used=review_changes(bindings,record_bindings(incoming,reader),receipts,args.reviews or active)
    plan={'hash_scheme':SCHEME,'input_pack_content_sha256':input_hash,'normalized_pack_content_sha256':sha(incoming),
          'pending_reviews':pending,'update_review_required':target is not None,'update_binding':target,
          'required_update_checkpoints':list(UPDATE_CHECKS)+([ACCESS_CHECK] if access_binding else [])+([MODE_B_CHECK] if mode_b_binding else []) if target else [],
          'approval_issued':False,'current_operations_verified':False,'automatic_weekly_integration_complete':False}
    if args.review_plan:
        require(all(p.read_bytes()==v for p,v in snapshots.items()),'reviewed input changed during plan')
        with args.review_plan.open('xb') as f:f.write(canonical(plan)+b'\n')
        print('review plan only; active pair unchanged; pending:',len(pending));return
    require(not pending,'Summary re-review required: '+', '.join(x['record_id'] for x in pending))
    update_review=check_update_review(target,args.update_review) if target else None
    reader={**reader,'pack_sha256':sha(incoming),'pack_hash_scheme':SCHEME,'pack_semantic_fingerprint':fingerprint(incoming)}
    history=load(active).get(PAIR,{}).get('change_receipts',[])
    for receipt in used:
        if receipt not in history:history.append(receipt)
    pair={'schema_version':1,'content_hash_scheme':SCHEME,'pack_content_sha256':sha(incoming),
          'reader_content_sha256':sha(reader),'reader_semantic_fingerprint':fingerprint(reader),'reader':reader,'record_bindings':new,'change_receipts':history,
          'current_operations_verified':False,'automatic_weekly_integration_complete':False}
    update_history=copy.deepcopy(load(active).get(PAIR,{}).get('update_reviews',[]))
    if update_review and update_review not in update_history:update_history.append(update_review)
    if update_history:pair['update_reviews']=update_history
    pair['pair_semantic_fingerprint']=fingerprint(pair)
    candidate={**incoming,PAIR:pair};validate_pair(candidate)
    # Hashes sort keys; the active JSON preserves input key order used by legacy UI folds.
    payload=json.dumps(candidate,ensure_ascii=False,separators=(',',':'),allow_nan=False).encode()+b'\n'
    require(active.read_bytes()==active_bytes,'active pair changed during review/build; retry against latest pair')
    require(all(path.read_bytes()==value for path,value in snapshots.items()),'reviewed input changed during build')
    if active_bytes!=payload:atomic_activate(active,payload)
    print('validated pair active; content SHA256:',pair['pack_content_sha256'],
          '; file SHA256:',hashlib.sha256(payload).hexdigest(),'; automatic weekly integration: incomplete')

if __name__=='__main__':
    try:main()
    except (ValueError,KeyError,TypeError,OSError,json.JSONDecodeError) as exc:raise SystemExit(str(exc))

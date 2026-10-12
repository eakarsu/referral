import React from 'react';
import NativeRuntimeAI from '../components/NativeRuntimeAI';
import {api} from '../api';
const request=(endpoint,body,options)=>api(endpoint,{...options,method:'POST',body:JSON.stringify(body)});
const config={
  "title": "Referral operations review",
  "description": "Native OpenRouter advisory review of supplied information. Examples are illustrative; existing records, evidence, approvals, permissions and operational controls remain authoritative. This response performs no external action.",
  "endpoint": "/runtime-ai/referral-operations-review",
  "fields": [
    {
      "key": "prompt",
      "label": "Review brief",
      "required": true,
      "maxLength": 4000,
      "examples": [
        "Illustrative Referral operations review brief: review supplied source information, identify evidence gaps, and suggest three next steps for an authorized reviewer. No external action is authorized.",
        "Illustrative Referral operations review team review: compare options, dependencies, responsible reviewers, and timing. Explain missing evidence and approvals before any operational change.",
        "Illustrative Referral operations review detailed review: distinguish verified facts from assumptions, compare tradeoffs, and suggest measurable follow-up actions. Do not invent records, integrations, approvals, clinical findings or financial execution."
      ]
    }
  ]
};
const loadHistory=()=>api('/runtime-ai/history');
export default function NativeAIReadiness(){return <NativeRuntimeAI config={config} request={request} loadHistory={loadHistory}/>;}

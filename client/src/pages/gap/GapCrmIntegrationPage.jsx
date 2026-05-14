// === Batch 11 Gaps & Frontend Mounts ===
import GapFeaturePage from '../../components/GapFeaturePage'
export default function GapCrmIntegrationPage() {
  return (
    <GapFeaturePage
      title="CRM Integration (Salesforce/HubSpot/LinkedIn)"
      description="CRM Integration (Salesforce/HubSpot/LinkedIn)"
      slug="crm-integration"
      aiResultKey="syncJob"
      fields={[
  {
    "name": "provider",
    "label": "Provider",
    "required": false,
    "placeholder": ""
  },
  {
    "name": "action",
    "label": "Action",
    "required": false,
    "placeholder": ""
  }
]}
    />
  )
}

// === Batch 11 Gaps & Frontend Mounts ===
import GapFeaturePage from '../../components/GapFeaturePage'
export default function GapReferralRoiAttributionPage() {
  return (
    <GapFeaturePage
      title="Referral Source ROI Attribution"
      description="Referral Source ROI Attribution"
      slug="referral-roi-attribution"
      aiResultKey="attribution"
      fields={[
  {
    "name": "touches",
    "label": "Touches (JSON)",
    "type": "json"
  },
  {
    "name": "dealValue",
    "label": "Deal Value",
    "type": "number"
  }
]}
    />
  )
}

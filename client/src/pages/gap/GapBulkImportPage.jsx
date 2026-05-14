// === Batch 11 Gaps & Frontend Mounts ===
import GapFeaturePage from '../../components/GapFeaturePage'
export default function GapBulkImportPage() {
  return (
    <GapFeaturePage
      title="Bulk Import/Export"
      description="Bulk Import/Export"
      slug="bulk-import"
      aiResultKey="job"
      fields={[
  {
    "name": "format",
    "label": "Format (CSV/JSON)",
    "required": false,
    "placeholder": ""
  },
  {
    "name": "direction",
    "label": "Direction",
    "required": false,
    "placeholder": ""
  }
]}
    />
  )
}

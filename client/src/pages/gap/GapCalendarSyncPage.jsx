// === Batch 11 Gaps & Frontend Mounts ===
import GapFeaturePage from '../../components/GapFeaturePage'
export default function GapCalendarSyncPage() {
  return (
    <GapFeaturePage
      title="Calendar Integration"
      description="Calendar Integration"
      slug="calendar-sync"
      aiResultKey="event"
      fields={[
  {
    "name": "provider",
    "label": "Provider",
    "required": false,
    "placeholder": ""
  },
  {
    "name": "title",
    "label": "Title",
    "required": false,
    "placeholder": ""
  },
  {
    "name": "startsAt",
    "label": "Starts At",
    "required": false,
    "placeholder": ""
  }
]}
    />
  )
}

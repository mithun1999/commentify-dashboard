import { CommentsForm } from './comments-form'
import ContentSection from './components/content-section'

export default function SettingsNotifications() {
  return (
    <ContentSection
      title='Your Comment Style'
      desc='Define your voice, tone, and rules so comments match your personality and goals.'
    >
      <CommentsForm />
    </ContentSection>
  )
}

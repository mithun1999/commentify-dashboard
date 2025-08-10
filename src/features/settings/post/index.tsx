import ContentSection from '../comments/components/content-section'
import { PostForm } from './post-form'

export default function SettingsAccount() {
  return (
    <ContentSection
      title='Post Preferences'
      desc='Choose your keywords, set how and where you comment, and manage targeting.'
    >
      <PostForm />
    </ContentSection>
  )
}

// The X helpers share the detection/messaging boundary with LinkedIn now, so
// a stale or disabled extension is handled identically on both platforms.
export {
  getTwitterProfileDetailsFromExtension,
  linkTwitterAccountFromExtension,
  type ITwitterProfileFromExtension,
} from '@/lib/extension'

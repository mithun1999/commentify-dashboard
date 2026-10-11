import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  IconBrandLinkedin,
  IconBrandX,
  IconDownload,
  IconExternalLink,
  IconLoader2,
  IconSparkles,
  IconTrash,
  IconX,
} from '@tabler/icons-react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useGetAllProfileQuery } from '@/features/users/query/profile.query'
import { noteDownloadUrl, type LibraryClaim } from '../api/library.api'
import {
  useDeleteNote,
  useDraftFromNote,
  useLibraryNote,
  useUpdateNote,
} from '../query/library.query'

const KIND_LABEL: Record<LibraryClaim['kind'], string> = {
  stat: 'Number',
  fact: 'Fact',
  quote: 'Quote',
  claim: 'Point',
  step: 'Step',
  definition: 'Definition',
}

/**
 * One note: its card (title, gist, topics; all editable), every point with
 * the sentence it came from (editable, removable), where it came from, which
 * posts used it, and "Use for…" to start a post built on it.
 */
export function NoteDrawer({
  noteId,
  onOpenChange,
  defaultProfileId,
}: {
  noteId: string | null
  onOpenChange: (open: boolean) => void
  /** Preselected in "Use for…" (a profile's Library tab). */
  defaultProfileId?: string
}) {
  const { data: note, isLoading } = useLibraryNote(noteId ?? undefined)
  const update = useUpdateNote()
  const remove = useDeleteNote()
  const draft = useDraftFromNote()
  const navigate = useNavigate()
  const { data: profiles } = useGetAllProfileQuery()

  const [title, setTitle] = useState('')
  const [gist, setGist] = useState('')
  const [topics, setTopics] = useState('')
  const [claims, setClaims] = useState<LibraryClaim[]>([])
  const [editingClaims, setEditingClaims] = useState(false)
  const [target, setTarget] = useState<string>('')
  const [instruction, setInstruction] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    if (!note) return
    setTitle(note.title)
    setGist(note.gist)
    setTopics(note.topics.join(', '))
    setClaims(note.claims)
    setEditingClaims(false)
    setShowAll(false)
  }, [note?._id, note?.updatedAt])
  useEffect(() => setInstruction(''), [note?._id])

  const postingProfiles = (profiles ?? []).filter((p) =>
    (p.activeAgentTypes ?? []).some((a) => a.endsWith('-posting'))
  )
  useEffect(() => {
    if (target) return
    const preset = postingProfiles.find((p) => p._id === defaultProfileId)
    if (preset || postingProfiles.length === 1) {
      setTarget((preset ?? postingProfiles[0])._id)
    }
  }, [defaultProfileId, postingProfiles.length])

  const save = (changes: Parameters<typeof update.mutate>[0]) =>
    update.mutate(changes)
  const shown = showAll ? claims : claims.slice(0, 30)

  const useFor = () => {
    if (!note || !target) return
    const profile = postingProfiles.find((p) => p._id === target)
    draft.mutate(
      { noteId: note._id, profileId: target, instruction },
      {
        onSuccess: ({ calendar, post }) =>
          navigate({
            to: '/agents/$profileId/$agentType/post/$postId' as any,
            params: {
              profileId: target,
              agentType:
                profile?.platform === 'twitter'
                  ? 'twitter-posting'
                  : 'linkedin-posting',
              postId: post._id,
            } as any,
            search: { calendarId: calendar._id } as any,
          }),
      }
    )
  }

  const download = async () => {
    if (!note) return
    const { url } = await noteDownloadUrl(note._id)
    window.open(url, '_blank', 'noopener')
  }

  return (
    <Sheet open={!!noteId} onOpenChange={onOpenChange}>
      <SheetContent className='w-full overflow-y-auto sm:max-w-xl'>
        <SheetHeader>
          <SheetTitle className='sr-only'>Library note</SheetTitle>
          <SheetDescription className='sr-only'>
            The note's card, points and usage
          </SheetDescription>
        </SheetHeader>

        {isLoading || !note ? (
          <div className='space-y-3 px-4'>
            <Skeleton className='h-8 w-3/4' />
            <Skeleton className='h-16 w-full' />
            <Skeleton className='h-40 w-full' />
          </div>
        ) : (
          <div className='space-y-6 px-4 pb-8'>
            <div className='space-y-2'>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() =>
                  title !== note.title && save({ id: note._id, title })
                }
                className='h-auto border-0 px-0 text-lg font-semibold shadow-none focus-visible:ring-0'
              />
              <Textarea
                value={gist}
                onChange={(e) => setGist(e.target.value)}
                onBlur={() =>
                  gist !== note.gist && save({ id: note._id, gist })
                }
                placeholder='What it says, in a line or two'
                className='min-h-[60px] resize-none text-sm'
              />
              <Input
                value={topics}
                onChange={(e) => setTopics(e.target.value)}
                onBlur={() => {
                  const next = topics
                    .split(',')
                    .map((t) => t.trim())
                    .filter(Boolean)
                  if (next.join(',') !== note.topics.join(',')) {
                    save({ id: note._id, topics: next })
                  }
                }}
                placeholder='Topics, separated by commas'
                className='text-xs'
              />
              <div className='text-muted-foreground flex flex-wrap items-center gap-3 text-xs'>
                {note.source.url && (
                  <a
                    href={note.source.url}
                    target='_blank'
                    rel='noreferrer'
                    className='hover:text-foreground inline-flex items-center gap-1'
                  >
                    <IconExternalLink className='size-3.5' />
                    Source
                  </a>
                )}
                {note.source.hasOriginal && (
                  <button
                    type='button'
                    onClick={download}
                    className='hover:text-foreground inline-flex items-center gap-1'
                  >
                    <IconDownload className='size-3.5' />
                    {note.source.fileName ?? 'Original file'}
                  </button>
                )}
                <span>
                  Added {format(new Date(note.createdAt), 'd MMM yyyy')}
                  {note.truncated
                    ? ' · long document, the middle was skipped'
                    : ''}
                </span>
              </div>
            </div>

            {/* Use for… */}
            <div className='space-y-2 rounded-lg border p-3'>
              <p className='flex items-center gap-1.5 text-sm font-medium'>
                <IconSparkles className='size-4' />
                Write a post from this
              </p>
              {postingProfiles.length === 0 ? (
                <p className='text-muted-foreground text-xs'>
                  Turn on a posting agent to write posts from your library.
                </p>
              ) : (
                <>
                  <Textarea
                    value={instruction}
                    onChange={(e) => setInstruction(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter')
                        useFor()
                    }}
                    placeholder='What should the post do with it? e.g. "Only the churn numbers, as a short story." Optional.'
                    className='min-h-[56px] resize-none text-xs'
                    rows={2}
                  />
                  <div className='flex flex-wrap items-center gap-2'>
                    <Select value={target} onValueChange={setTarget}>
                      <SelectTrigger className='h-8 w-[220px] text-xs'>
                        <SelectValue placeholder='Choose a profile' />
                      </SelectTrigger>
                      <SelectContent>
                        {postingProfiles.map((p) => (
                          <SelectItem
                            key={p._id}
                            value={p._id}
                            className='text-xs'
                          >
                            {p.platform === 'twitter'
                              ? `@${(p as any).screenName ?? ''} on X`
                              : `${p.firstName} ${p.lastName} on LinkedIn`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size='sm'
                      className='h-8'
                      disabled={
                        !target || draft.isPending || note.status !== 'ready'
                      }
                      onClick={useFor}
                    >
                      {draft.isPending && (
                        <IconLoader2 className='mr-1 size-3.5 animate-spin' />
                      )}
                      Write it
                    </Button>
                  </div>
                </>
              )}
              <p className='text-muted-foreground text-[11px]'>
                A draft built on this note, for you to review. Uses one
                generation.
              </p>
            </div>

            {/* Points */}
            <div className='space-y-2'>
              <div className='flex items-center justify-between'>
                <p className='text-sm font-medium'>
                  {claims.length} point{claims.length === 1 ? '' : 's'}
                </p>
                {claims.length > 0 &&
                  (editingClaims ? (
                    <div className='flex gap-2'>
                      <Button
                        size='sm'
                        variant='ghost'
                        className='h-7'
                        onClick={() => {
                          setClaims(note.claims)
                          setEditingClaims(false)
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size='sm'
                        className='h-7'
                        onClick={() => {
                          save({
                            id: note._id,
                            claims: claims.map((c) => ({
                              id: c.id,
                              text: c.text,
                            })),
                          })
                          setEditingClaims(false)
                        }}
                      >
                        Save points
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size='sm'
                      variant='ghost'
                      className='h-7'
                      onClick={() => setEditingClaims(true)}
                    >
                      Edit
                    </Button>
                  ))}
              </div>
              <div className='divide-y rounded-lg border'>
                {shown.map((claim) => (
                  <div key={claim.id} className='space-y-1 px-3 py-2'>
                    <div className='flex items-start gap-2'>
                      <Badge
                        variant='outline'
                        className='mt-0.5 shrink-0 text-[10px]'
                      >
                        {KIND_LABEL[claim.kind] ?? 'Point'}
                      </Badge>
                      {editingClaims ? (
                        <>
                          <Textarea
                            value={claim.text}
                            onChange={(e) =>
                              setClaims((prev) =>
                                prev.map((c) =>
                                  c.id === claim.id
                                    ? { ...c, text: e.target.value }
                                    : c
                                )
                              )
                            }
                            className='min-h-[52px] flex-1 resize-none text-xs'
                          />
                          <Button
                            size='icon'
                            variant='ghost'
                            className='size-7 shrink-0'
                            title='Remove this point'
                            onClick={() =>
                              setClaims((prev) =>
                                prev.filter((c) => c.id !== claim.id)
                              )
                            }
                          >
                            <IconX className='size-3.5' />
                          </Button>
                        </>
                      ) : (
                        <p className='text-sm'>{claim.text}</p>
                      )}
                    </div>
                    {!editingClaims &&
                      claim.evidence &&
                      claim.evidence !== claim.text && (
                        <p className='text-muted-foreground border-l-2 pl-2 text-xs italic'>
                          {claim.evidence}
                        </p>
                      )}
                  </div>
                ))}
                {claims.length === 0 && (
                  <p className='text-muted-foreground px-3 py-2 text-sm'>
                    {note.status === 'processing'
                      ? 'Still reading…'
                      : 'No citable points were found.'}
                  </p>
                )}
              </div>
              {!showAll && claims.length > 30 && (
                <Button
                  size='sm'
                  variant='ghost'
                  className='h-7'
                  onClick={() => setShowAll(true)}
                >
                  Show all {claims.length}
                </Button>
              )}
            </div>

            {/* Used by */}
            {note.usedBy.length > 0 && (
              <div className='space-y-2'>
                <p className='text-sm font-medium'>Used by</p>
                <div className='divide-y rounded-lg border'>
                  {note.usedBy.map((u) => {
                    const profile = profiles?.find((p) => p._id === u.profileId)
                    const Icon =
                      u.platform === 'twitter' ? IconBrandX : IconBrandLinkedin
                    return (
                      <Link
                        key={u.postId}
                        to={'/agents/$profileId/$agentType/post/$postId' as any}
                        params={
                          {
                            profileId: u.profileId,
                            agentType:
                              u.platform === 'twitter'
                                ? 'twitter-posting'
                                : 'linkedin-posting',
                            postId: u.postId,
                          } as any
                        }
                        search={{ calendarId: u.calendarId } as any}
                        className='hover:bg-muted/50 flex items-center gap-2 px-3 py-2 text-xs'
                      >
                        <Icon className='size-3.5 shrink-0' />
                        <span className='min-w-0 flex-1 truncate'>
                          {u.topic || 'Post'}
                        </span>
                        <span className='text-muted-foreground shrink-0'>
                          {profile
                            ? profile.platform === 'twitter'
                              ? `@${(profile as any).screenName ?? ''}`
                              : profile.firstName
                            : ''}{' '}
                          · {u.status}
                          {u.scheduledAt
                            ? ` · ${format(new Date(u.scheduledAt), 'd MMM')}`
                            : ''}
                        </span>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}

            <Button
              variant='ghost'
              size='sm'
              className='text-red-600 hover:text-red-600'
              onClick={() => setConfirmDelete(true)}
            >
              <IconTrash className='mr-1 size-4' />
              Delete note
            </Button>
          </div>
        )}

        <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
          <AlertDialogContent>
            <AlertDialogHeader className='text-left'>
              <AlertDialogTitle>Delete this note?</AlertDialogTitle>
              <AlertDialogDescription>
                Its text, points and any stored file are deleted. Posts already
                written from it stay as they are.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <Button
                variant='destructive'
                disabled={remove.isPending}
                onClick={() =>
                  note &&
                  remove.mutate(note._id, {
                    onSuccess: () => {
                      setConfirmDelete(false)
                      onOpenChange(false)
                    },
                  })
                }
              >
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SheetContent>
    </Sheet>
  )
}

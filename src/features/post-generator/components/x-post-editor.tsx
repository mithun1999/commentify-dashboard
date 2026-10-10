import { useEffect, useRef, useState } from 'react'
import { IconPlus, IconTrash } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import {
  X_LONG_POST_LIMIT,
  X_POST_LIMIT,
  X_THREAD_MAX_POSTS,
  X_THREAD_MIN_POSTS,
  joinThread,
  splitThread,
  xWeightedLength,
  type XFormat,
} from '../utils/x-text'

interface XPostEditorProps {
  content: string
  format: XFormat
  onChange: (content: string) => void
}

/**
 * The X editor. A thread is edited post by post, each against X's 280, and
 * stored as one text with `---` lines between posts, which is what the
 * backend splits on to publish. A single or long post is one box against its
 * own limit. Counts are X's: links weigh 23, emoji and CJK 2.
 */
export function XPostEditor({ content, format, onChange }: XPostEditorProps) {
  if (format === 'thread') {
    return <ThreadEditor content={content} onChange={onChange} />
  }
  const limit = format === 'long_post' ? X_LONG_POST_LIMIT : X_POST_LIMIT
  return (
    <div className='space-y-1'>
      <Textarea
        value={content}
        onChange={(e) => onChange(e.target.value)}
        className='min-h-[40vh] resize-none border-0 bg-transparent p-0 text-sm leading-relaxed shadow-none focus-visible:ring-0'
        placeholder='Post content...'
      />
      <Counter length={xWeightedLength(content)} limit={limit} />
    </div>
  )
}

function ThreadEditor({
  content,
  onChange,
}: {
  content: string
  onChange: (content: string) => void
}) {
  // Local, because an empty post just added has no place in the stored text
  // (joining drops it) and would vanish on the next render otherwise. The
  // text from outside wins whenever it changes for another reason, such as a
  // chat edit.
  const [posts, setPosts] = useState<string[]>(() => initialPosts(content))
  const lastEmitted = useRef(content)
  useEffect(() => {
    if (content !== lastEmitted.current) {
      setPosts(initialPosts(content))
      lastEmitted.current = content
    }
  }, [content])

  const update = (next: string[]) => {
    setPosts(next)
    const joined = joinThread(next)
    lastEmitted.current = joined
    onChange(joined)
  }

  const filled = posts.filter((p) => p.trim()).length

  return (
    <div className='space-y-3'>
      {posts.map((post, i) => {
        const length = xWeightedLength(post)
        return (
          <div key={i} className='rounded-lg border p-3'>
            <div className='mb-1.5 flex items-center justify-between'>
              <span className='text-muted-foreground text-[11px] font-medium'>
                {i + 1}/{posts.length}
              </span>
              <div className='flex items-center gap-2'>
                <Counter length={length} limit={X_POST_LIMIT} />
                <Button
                  variant='ghost'
                  size='icon'
                  className='size-6'
                  disabled={posts.length <= 1}
                  onClick={() => update(posts.filter((_, j) => j !== i))}
                  aria-label={`Remove post ${i + 1}`}
                >
                  <IconTrash className='size-3.5' />
                </Button>
              </div>
            </div>
            <Textarea
              value={post}
              onChange={(e) =>
                update(posts.map((p, j) => (j === i ? e.target.value : p)))
              }
              className='min-h-[72px] resize-none border-0 bg-transparent p-0 text-sm leading-relaxed shadow-none focus-visible:ring-0'
              placeholder={i === 0 ? 'The hook: the post people see first' : 'Next post...'}
            />
          </div>
        )
      })}
      <div className='flex items-center justify-between'>
        <Button
          variant='outline'
          size='sm'
          disabled={posts.length >= X_THREAD_MAX_POSTS}
          onClick={() => update([...posts, ''])}
        >
          <IconPlus className='mr-1 size-3.5' />
          Add post
        </Button>
        {filled < X_THREAD_MIN_POSTS && (
          <span className='text-xs text-amber-600'>
            {filled <= 1
              ? 'With one post left it goes out as a single post.'
              : `Threads read best with at least ${X_THREAD_MIN_POSTS} posts.`}
          </span>
        )}
      </div>
    </div>
  )
}

function initialPosts(content: string): string[] {
  const posts = splitThread(content)
  return posts.length ? posts : ['']
}

function Counter({ length, limit }: { length: number; limit: number }) {
  return (
    <span
      className={cn(
        'text-xs tabular-nums',
        length > limit ? 'font-medium text-red-500' : 'text-muted-foreground'
      )}
    >
      {length}/{limit}
    </span>
  )
}

/** The footer summary: one count for a post, the post count for a thread. */
export function xLengthSummary(
  content: string,
  format: XFormat
): { label: string; over: boolean } {
  if (format === 'thread') {
    const posts = splitThread(content)
    const over = posts.some((p) => xWeightedLength(p) > X_POST_LIMIT)
    return {
      label: `Thread · ${posts.length} post${posts.length === 1 ? '' : 's'}`,
      over: over || posts.length > X_THREAD_MAX_POSTS,
    }
  }
  const limit = format === 'long_post' ? X_LONG_POST_LIMIT : X_POST_LIMIT
  const length = xWeightedLength(content)
  return { label: `${length}/${limit}`, over: length > limit }
}

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { IPost } from '../interface/post.interface'
import { useUpdatePostComment } from '../query/post.query'

interface PostCommentDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  post: IPost | null
}

export function PostCommentDrawer({ open, onOpenChange, post }: PostCommentDrawerProps) {
  const [commentContent, setCommentContent] = useState('')

  useEffect(() => {
    setCommentContent(post?.comment?.content ?? '')
  }, [post])

  const { updateComment, isUpdatingComment } = useUpdatePostComment(() => {
    onOpenChange(false)
  })

  const handleSave = () => {
    if (!post) return
    updateComment({
      profileId: post.profileId,
      activityUrn: post.activityUrn,
      commentContent,
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='flex flex-col'>
        <SheetHeader className='text-left'>
          <SheetTitle>Edit Comment</SheetTitle>
          <SheetDescription>Update the comment for this post.</SheetDescription>
        </SheetHeader>

        <div className='flex-1 space-y-4 overflow-y-auto px-4 py-2'>
          <div>
            <div className='text-sm font-medium mb-1'>Post</div>
            <div className='text-muted-foreground whitespace-pre-wrap rounded-md border p-3 text-sm'>
              {post?.content ?? '--'}
            </div>
          </div>

          <div>
            <div className='text-sm font-medium mb-1'>Comment</div>
            <Textarea
              value={commentContent}
              onChange={(e) => setCommentContent(e.target.value)}
              placeholder='Enter your comment'
              rows={8}
            />
          </div>
        </div>

        <SheetFooter className='gap-2'>
          <Button variant='outline' onClick={() => onOpenChange(false)} disabled={isUpdatingComment}>
            Close
          </Button>
          <Button onClick={handleSave} disabled={isUpdatingComment}>
            Save changes
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}



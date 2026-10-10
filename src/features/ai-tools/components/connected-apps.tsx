import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/confirm-dialog'
import type { IMcpConnection } from '../api/mcp.api'
import { useDisconnectMcpApp } from '../query/mcp.query'
import { ClientBadge } from './client-badge'

const ago = (value?: string) =>
  value ? formatDistanceToNow(new Date(value), { addSuffix: true }) : null

const where = (host?: string) =>
  !host ? null : host === 'this computer' ? 'on this computer' : `via ${host}`

export function ConnectedApps({
  connections,
}: {
  connections: IMcpConnection[]
}) {
  const [target, setTarget] = useState<IMcpConnection | null>(null)
  const disconnect = useDisconnectMcpApp()

  const onConfirm = () => {
    if (!target) return
    disconnect.mutate(target.id, {
      onSuccess: () => {
        toast.success(`${target.name} is disconnected`)
        setTarget(null)
      },
      onError: () => toast.error('Could not disconnect it. Try again.'),
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className='text-base'>Connected apps</CardTitle>
      </CardHeader>
      <CardContent>
        {connections.length === 0 ? (
          <p className='text-muted-foreground text-sm'>
            No apps connected yet. Pick one above. It shows up here once you
            click Allow.
          </p>
        ) : (
          <ul className='divide-y'>
            {connections.map((app) => (
              <li
                key={app.id}
                className='flex items-center gap-3 py-3 first:pt-0 last:pb-0'
              >
                <ClientBadge name={app.name} />
                <div className='min-w-0 flex-1'>
                  <p className='truncate font-medium'>{app.name}</p>
                  <p className='text-muted-foreground truncate text-sm'>
                    {[
                      where(app.redirectHost),
                      app.connectedAt && `connected ${ago(app.connectedAt)}`,
                      app.lastUsedAt && `last used ${ago(app.lastUsedAt)}`,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => setTarget(app)}
                >
                  Disconnect
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <ConfirmDialog
        open={Boolean(target)}
        onOpenChange={(open) => !open && setTarget(null)}
        title={`Disconnect ${target?.name ?? 'this app'}?`}
        desc='It loses access to your Commentify account straight away. You can connect it again any time.'
        confirmText='Disconnect'
        destructive
        isLoading={disconnect.isPending}
        handleConfirm={onConfirm}
      />
    </Card>
  )
}

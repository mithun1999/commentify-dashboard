import { Table } from '@tanstack/react-table'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { statuses } from '../data/data'
import { useHistoryStore } from '../store/history.store'
import { DataTableViewOptions } from './data-table-view-options'

interface DataTableToolbarProps<TData> {
  table: Table<TData>
}

export function DataTableToolbar<TData>({
  table,
}: DataTableToolbarProps<TData>) {
  const status = useHistoryStore((s) => s.status)
  const setStatus = useHistoryStore((s) => s.setStatus)
  return (
    <div className='flex items-center justify-between'>
      <div className='flex flex-1 flex-col gap-y-2 sm:flex-row sm:items-center sm:space-x-2'>
        <div className='flex flex-col gap-1'>
          <Label className='text-muted-foreground text-xs tracking-wide uppercase'>
            Status
          </Label>
          <Tabs
            value={status}
            onValueChange={(val) => setStatus(val as 'pending' | 'completed')}
            className='gap-1'
          >
            <TabsList>
              {statuses.map(({ value, label, icon: Icon }) => (
                <TabsTrigger key={value} value={value} className='gap-1.5'>
                  {Icon && <Icon className='h-4 w-4' />}
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>
      <DataTableViewOptions table={table} />
    </div>
  )
}

import { Table } from '@tanstack/react-table'
import { statuses } from '../data/data'
import { DataTableFacetedFilter } from './data-table-faceted-filter'
import { DataTableViewOptions } from './data-table-view-options'
import { useHistoryStore } from '../store/history.store'

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
      <div className='flex flex-1 flex-col-reverse items-start gap-y-2 sm:flex-row sm:items-center sm:space-x-2'>
        <div className='flex gap-x-2'>
          <DataTableFacetedFilter
            title='Status'
            options={statuses}
            singleSelect
            selected={status}
            onChangeSelected={(val) => setStatus(val as 'pending' | 'completed')}
          />
        </div>
      </div>
      <DataTableViewOptions table={table} />
    </div>
  )
}

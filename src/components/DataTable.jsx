import React from 'react'
import Table from './Table.jsx'

export default function DataTable({
  columns,
  data,
  searchable = true,
  pagination = true,
  pageSize = 10,
  emptyMessage = 'No data',
  className = '',
}) {
  return (
    <Table
      columns={columns}
      data={data}
      searchable={searchable}
      pagination={pagination}
      pageSize={pageSize}
      emptyMessage={emptyMessage}
      className={className}
    />
  )
}


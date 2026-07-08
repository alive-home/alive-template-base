import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { type ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table"
import type { Todo } from "@template/shared"
import { trpc } from "#/lib/trpc.ts"

export const Route = createFileRoute("/todos")({
  component: TodosPage,
})

function TodosPage() {
  const qc = useQueryClient()
  const list = useQuery(trpc.todo.list.queryOptions())

  const create = useMutation(
    trpc.todo.create.mutationOptions({
      onSuccess: () => qc.invalidateQueries({ queryKey: trpc.todo.list.queryKey() }),
    }),
  )
  const toggle = useMutation(
    trpc.todo.toggle.mutationOptions({
      onSuccess: () => qc.invalidateQueries({ queryKey: trpc.todo.list.queryKey() }),
    }),
  )

  const columns: ColumnDef<Todo>[] = [
    {
      accessorKey: "done",
      header: "",
      cell: ({ row }) => (
        <input type="checkbox" checked={row.original.done} onChange={() => toggle.mutate({ id: row.original.id })} />
      ),
    },
    { accessorKey: "title", header: "Title" },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ getValue }) => new Date(getValue<string>()).toLocaleString(),
    },
  ]

  const table = useReactTable({
    data: list.data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  if (list.isError) {
    return <p className="text-red-600">Sign in to view todos.</p>
  }

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Todos</h1>
      <form
        className="flex gap-2"
        onSubmit={e => {
          e.preventDefault()
          const fd = new FormData(e.currentTarget)
          const title = String(fd.get("title") ?? "").trim()
          if (title) create.mutate({ title })
          e.currentTarget.reset()
        }}
      >
        <input
          name="title"
          required
          className="flex-1 rounded border border-neutral-300 px-3 py-2"
          placeholder="new todo"
        />
        <button type="submit" className="rounded bg-neutral-900 px-4 py-2 text-white">
          add
        </button>
      </form>

      <table className="w-full border-collapse text-sm">
        <thead>
          {table.getHeaderGroups().map(hg => (
            <tr key={hg.id} className="border-b border-neutral-200 text-left">
              {hg.headers.map(h => (
                <th key={h.id} className="px-2 py-2 font-medium">
                  {flexRender(h.column.columnDef.header, h.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map(row => (
            <tr key={row.id} className="border-b border-neutral-100">
              {row.getVisibleCells().map(cell => (
                <td key={cell.id} className="px-2 py-2">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

import { useForm } from "@tanstack/react-form"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { HelloInput } from "@template/shared"
import { Button } from "@template/ui"
import { useState } from "react"
import { orpc } from "#/lib/orpc.ts"

export const Route = createFileRoute("/")({
  component: HomePage,
})

function HomePage() {
  const [name, setName] = useState("world")
  const hello = useQuery(orpc.hello.queryOptions({ input: { name } }))

  const form = useForm({
    defaultValues: { name: "" },
    validators: { onChange: HelloInput },
    onSubmit: async ({ value }) => setName(value.name),
  })

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Hello oRPC</h1>
        <p className="text-neutral-600">{hello.isPending ? "loading…" : hello.data?.message}</p>
      </header>

      <form
        onSubmit={e => {
          e.preventDefault()
          form.handleSubmit()
        }}
        className="flex gap-2"
      >
        <form.Field name="name">
          {field => (
            <input
              className="flex-1 rounded border border-neutral-300 px-3 py-2"
              placeholder="your name"
              value={field.state.value}
              onChange={e => field.handleChange(e.target.value)}
            />
          )}
        </form.Field>
        <Button type="submit">greet</Button>
      </form>
    </section>
  )
}

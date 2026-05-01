import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	Link,
	Outlet,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()(
	{
		component: RootLayout,
	},
);

function RootLayout() {
	return (
		<div className="min-h-screen bg-neutral-50 text-neutral-900">
			<header className="border-b border-neutral-200 bg-white">
				<nav className="mx-auto flex max-w-3xl items-center gap-4 px-6 py-3 text-sm">
					<Link to="/" className="font-semibold">
						template
					</Link>
					<Link to="/todos" className="text-neutral-600 hover:text-neutral-900">
						todos
					</Link>
				</nav>
			</header>
			<main className="mx-auto max-w-3xl px-6 py-8">
				<Outlet />
			</main>
			<TanStackRouterDevtools position="bottom-right" />
		</div>
	);
}

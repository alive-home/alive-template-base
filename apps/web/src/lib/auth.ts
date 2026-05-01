import { useSyncExternalStore } from "react";

const KEY = "auth.token";
const listeners = new Set<() => void>();

function notify() {
	for (const l of listeners) l();
}

export function getToken(): string | null {
	return typeof localStorage === "undefined" ? null : localStorage.getItem(KEY);
}

export function setToken(token: string | null) {
	if (token) localStorage.setItem(KEY, token);
	else localStorage.removeItem(KEY);
	notify();
}

export function useToken(): string | null {
	return useSyncExternalStore(
		(cb) => {
			listeners.add(cb);
			return () => listeners.delete(cb);
		},
		getToken,
		() => null,
	);
}

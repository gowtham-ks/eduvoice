export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

type Options = {
  method?: "GET" | "POST";
  body?: unknown;
  /** Send NO cookies. Used for the anonymous feedback submission. */
  anonymous?: boolean;
};

export async function api<T = unknown>(path: string, opts: Options = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: opts.method ?? (opts.body ? "POST" : "GET"),
    headers: opts.body ? { "Content-Type": "application/json" } : undefined,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    credentials: opts.anonymous ? "omit" : "same-origin",
    cache: "no-store",
  });
  if (!res.ok) {
    let message = "Something went wrong. Try again.";
    try {
      const data = await res.json();
      if (typeof data.detail === "string") message = data.detail;
      else if (res.status === 422) message = "Some answers are missing or invalid. Check the form and try again.";
    } catch {}
    throw new ApiError(res.status, message);
  }
  return res.json() as Promise<T>;
}

export type Me = { name: string; role: "student" | "teacher" | "admin" };

export const homeFor = (role: Me["role"]) => (role === "student" ? "/student" : role === "teacher" ? "/teacher" : "/admin");

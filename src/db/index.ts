import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null

function getDb() {
  if (_db) return _db

  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set')
  }

  // Strip channel_binding param (unsupported by postgres.js, added by Neon)
  const url = new URL(connectionString)
  url.searchParams.delete('channel_binding')
  const requireSSL =
    url.searchParams.get('sslmode') === 'require' || process.env.DATABASE_SSL === 'true'
  const cleanedUrl = url.toString()

  const isProduction = process.env.NODE_ENV === 'production'

  const client = postgres(cleanedUrl, {
    max: isProduction ? 5 : 20,
    idle_timeout: 20,
    connect_timeout: 10,
    max_lifetime: 60 * 30,
    ssl: requireSSL,
    ...(isProduction && {
      prepare: false,
    }),
  })

  _db = drizzle(client, {
    schema,
    logger: process.env.NODE_ENV === 'development',
  })

  return _db
}

// Lazy proxy — db is only initialized on first property access
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop) {
    return (getDb() as unknown as Record<string | symbol, unknown>)[prop]
  },
})

export * from './schema'

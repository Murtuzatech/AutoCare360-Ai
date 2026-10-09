import { supabase } from './supabase'

const PAGE = 1000 // PostgREST returns at most 1000 rows per request, so larger tables must be paged

/** Loads every row of a table (RLS limits it to the signed-in user), paging past the 1000-row cap. */
export async function fetchAll(table, { column = 'created_at', ascending = false } = {}) {
  const rows = []
  for (let page = 0; page < 100; page++) {
    const from = page * PAGE
    const { data, error } = await supabase.from(table).select('*')
      .order(column, { ascending }).order('id') // second sort keeps paging stable when the first column ties
      .range(from, from + PAGE - 1)
    if (error) return { error }
    rows.push(...data)
    if (data.length < PAGE) break
  }
  return { data: rows }
}

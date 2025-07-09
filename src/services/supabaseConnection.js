
// import { createClient } from '@supabase/supabase-js'

// // process.env.SUPABASE_KEY

// const supabaseUrl = 'https://pyrmxtvtcftfmtwdkeat.supabase.co'
// const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5cm14dHZ0Y2Z0Zm10d2RrZWF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4NjM0MzUsImV4cCI6MjA2NzQzOTQzNX0.rD0B3EIrsaNme3mlqecxBoj1xbg7B9mnF75z5xA3rKA'
// const supabase = createClient(supabaseUrl, supabaseKey)

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://pyrmxtvtcftfmtwdkeat.supabase.co'
const supabaseKey = process.env.SUPABASE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

//console.log(supabase);

async function getAllRowsFromTable(table) {
  const { data, error } = await supabase
    .from(table) // <-- must match your table name exactly (lowercase by default in Postgres!)
    .select('*')

  if (error) {
    console.error('Query error:', error)
  } else {
    console.log(table, data)
  }
}

getAllRowsFromTable("game");

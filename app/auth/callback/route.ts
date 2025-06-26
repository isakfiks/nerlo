import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const type = requestUrl.searchParams.get('type')

  if (code) {
    const supabase = createRouteHandlerClient({ cookies })
    const { data } = await supabase.auth.exchangeCodeForSession(code)
    
    if (data.user) {
      // If recovery go to reset pass page
      if (type === 'recovery') {
        return NextResponse.redirect(new URL('/reset-password', request.url))
      }

      // Regular login flow
      const { data: family } = await supabase
        .from('families')
        .select('id')
        .eq('parent_id', data.user.id)
        .single()

      if (family) {
        return NextResponse.redirect(new URL('/app', request.url))
      } else {
        return NextResponse.redirect(new URL('/onboarding', request.url))
      }
    }
  }

  return NextResponse.redirect(new URL('/login?error=auth_callback_error', request.url))
}

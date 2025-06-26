import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { taskId, workTime } = await request.json();

    const { error } = await supabase
      .from('tasks')
      .update({ work_time_ms: workTime })
      .eq('id', taskId);

    if (error) throw error;

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Error saving work time:', error);
    return new Response('Error', { status: 500 });
  }
}

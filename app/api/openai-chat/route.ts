import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, conversation, apiKey, systemPrompt } = body;

    if (!message) {
      return NextResponse.json(
        { error: 'Mensaje es requerido' },
        { status: 400 }
      );
    }

    // Verificar que OpenAI API Key esté configurada
    const openaiApiKey = apiKey || process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      console.error('OpenAI API Key no configurada');
      return NextResponse.json(
        {
          success: false,
          error:
            'OpenAI API Key no configurada. Configure la API Key en el chat.',
        },
        { status: 400 }
      );
    }

    // Preparar el historial de conversación para OpenAI
    const defaultSystemPrompt = `
    Responde siempre forma estructurada clara y consisa. 
    Puedes usar markdown para formatear tu respuesta solo negritas.
    Rechaza cualquier pregunta que no sea de Técnología.
    `;

    // Construir el array de mensajes correctamente
    const messages = [
      {
        role: 'system',
        content: systemPrompt || defaultSystemPrompt,
      },
      ...conversation.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      })),
      {
        role: 'user',
        content: message,
      },
    ];

    // Llamar a OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        max_tokens: 1500,
        temperature: 0.3,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error de OpenAI API:', errorData);
      return NextResponse.json(
        {
          success: false,
          error: `Error de OpenAI API: ${
            errorData.error?.message || 'Error desconocido'
          }`,
        },
        { status: 400 }
      );
    }

    const data = await response.json();
    const assistantMessage =
      data.choices[0]?.message?.content || 'No se pudo generar respuesta';

    return NextResponse.json({
      success: true,
      response: assistantMessage,
      usage: data.usage,
    });
  } catch (error: any) {
    console.error('Error en OpenAI Chat API:', error);
    return NextResponse.json(
      {
        success: false,
        error: `Error interno: ${error.message}`,
      },
      { status: 400 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      message,
      conversation,
      apiKey,
      systemPrompt,
      assistantId,
      clearThread,
    } = body;

    // Si es para limpiar thread, solo crear un nuevo thread y retornar
    if (clearThread && assistantId) {
      const openaiApiKey = apiKey || process.env.OPENAI_API_KEY;
      if (!openaiApiKey) {
        return NextResponse.json(
          { error: 'API Key no configurada' },
          { status: 400 }
        );
      }

      try {
        const response = await fetch('https://api.openai.com/v1/threads', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
            'OpenAI-Beta': 'assistants=v2',
          },
          body: JSON.stringify({}),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Error creando thread:', errorData);
          return NextResponse.json(
            {
              error: `Error creando thread: ${
                errorData.error?.message || 'Error desconocido'
              }`,
            },
            { status: 500 }
          );
        }

        const threadData = await response.json();
        console.log('Nuevo thread creado:', threadData.id);

        return NextResponse.json({
          success: true,
          message: 'Thread limpiado correctamente',
          threadId: threadData.id,
        });
      } catch (error) {
        console.error('Error interno:', error);
        return NextResponse.json(
          { error: `Error interno: ${error}` },
          { status: 500 }
        );
      }
    }

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
    // Si se usa Assistant ID, no incluir system prompt (el asistente tiene el suyo)
    const messages = assistantId
      ? [
          ...conversation.map((msg: any) => ({
            role: msg.role,
            content: msg.content,
          })),
          {
            role: 'user',
            content: message,
          },
        ]
      : [
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

    // Determinar si usar Assistant API o Chat Completions API
    let response;

    if (assistantId) {
      // Usar Assistant API
      response = await fetch('https://api.openai.com/v1/threads', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2',
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error creando thread:', errorData);
        throw new Error(
          `Error creando thread: ${
            errorData.error?.message || 'Error desconocido'
          }`
        );
      }

      const thread = await response.json();
      const threadId = thread.id;

      // Agregar mensaje al thread
      const addMessageResponse = await fetch(
        `https://api.openai.com/v1/threads/${threadId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
            'OpenAI-Beta': 'assistants=v2',
          },
          body: JSON.stringify({
            role: 'user',
            content: message,
          }),
        }
      );

      if (!addMessageResponse.ok) {
        const errorData = await addMessageResponse.json();
        console.error('Error agregando mensaje al thread:', errorData);
        throw new Error(
          `Error agregando mensaje: ${
            errorData.error?.message || 'Error desconocido'
          }`
        );
      }

      // Ejecutar el asistente
      const runResponse = await fetch(
        `https://api.openai.com/v1/threads/${threadId}/runs`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
            'OpenAI-Beta': 'assistants=v2',
          },
          body: JSON.stringify({
            assistant_id: assistantId,
          }),
        }
      );

      if (!runResponse.ok) {
        const errorData = await runResponse.json();
        console.error('Error ejecutando asistente:', errorData);
        throw new Error(
          `Error ejecutando asistente: ${
            errorData.error?.message || 'Error desconocido'
          }`
        );
      }

      const run = await runResponse.json();
      const runId = run.id;

      // Esperar a que termine la ejecución
      let runStatus = 'queued';
      let attempts = 0;
      const maxAttempts = 60; // 60 segundos máximo

      while (runStatus === 'queued' || runStatus === 'in_progress') {
        if (attempts >= maxAttempts) {
          throw new Error('Timeout: El asistente tardó demasiado en responder');
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
        attempts++;

        console.log(
          `Verificando status del run (intento ${attempts}): ${runStatus}`
        );

        const statusResponse = await fetch(
          `https://api.openai.com/v1/threads/${threadId}/runs/${runId}`,
          {
            headers: {
              Authorization: `Bearer ${openaiApiKey}`,
              'OpenAI-Beta': 'assistants=v2',
            },
          }
        );

        if (!statusResponse.ok) {
          const errorData = await statusResponse.json();
          console.error('Error obteniendo status del run:', errorData);
          throw new Error(
            `Error obteniendo status: ${
              errorData.error?.message || 'Error desconocido'
            }`
          );
        }

        const statusData = await statusResponse.json();
        runStatus = statusData.status;
        console.log(`Status actualizado: ${runStatus}`);
      }

      if (runStatus !== 'completed') {
        throw new Error(`Error en ejecución del asistente: ${runStatus}`);
      }

      // Obtener los mensajes del thread
      const messagesResponse = await fetch(
        `https://api.openai.com/v1/threads/${threadId}/messages`,
        {
          headers: {
            Authorization: `Bearer ${openaiApiKey}`,
            'OpenAI-Beta': 'assistants=v2',
          },
        }
      );

      if (!messagesResponse.ok) {
        const errorData = await messagesResponse.json();
        console.error('Error obteniendo mensajes del thread:', errorData);
        throw new Error(
          `Error obteniendo mensajes: ${
            errorData.error?.message || 'Error desconocido'
          }`
        );
      }

      const messagesData = await messagesResponse.json();
      const assistantMessage = messagesData.data.find(
        (msg: any) => msg.role === 'assistant'
      );

      return NextResponse.json({
        success: true,
        response:
          assistantMessage?.content[0]?.text?.value ||
          'No se pudo generar respuesta',
        usage: { total_tokens: 0 }, // Assistant API no proporciona usage en esta implementación
      });
    } else {
      // Usar Chat Completions API (comportamiento original)
      response = await fetch('https://api.openai.com/v1/chat/completions', {
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
    }

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

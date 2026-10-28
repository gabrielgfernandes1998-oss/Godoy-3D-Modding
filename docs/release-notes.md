# Godoy 3D Modding 0.11.8 beta

- Corrige cabeçalhos de VertexBuffer/IndexBuffer compartilhados entre geometrias/LODs, que deixam os mesmos campos de ponteiro sujeitos a fixup repetido no carregamento. Cada geometria agora recebe cabeçalhos independentes. Somente dados brutos idênticos de vértices/índices são compartilhados; o limite de 100.000.000 bytes permanece ativo.
- **Compactar YDD já exportado** repara essa estrutura em arquivos antigos, mesmo quando já estão abaixo do limite de memória. Use o resultado com o YTD original. Conversão e exportação nativa de malhas usam a mesma correção.
- Valida as regiões virtual/física dos ponteiros conhecidos e a independência dos cabeçalhos após serializar/reabrir. O editor e o Pack detectam cabeçalhos de buffer reutilizados em geometrias distintas e orientam atualizar o YDD antes da exportação.
- Traduz os ossos do conversor para português: Quadril / bacia, Tórax / peito, Pé — lado direito, controles auxiliares e expressões faciais. Preserva o nome técnico e o ID, inclusive nos valores usados na exportação. Lados esquerdo/direito correspondem ao personagem.

No arquivo privado da mochila, a saída mantém todos os vértices, índices, UVs, cores, pesos e esqueleto; 103 geometrias e 2.233.750 triângulos por LOD. YDD de 58.601.890 bytes com reserva de sistema de 81.788.928 bytes e cabeçalhos independentes. YTD não alterado.

Regressões incluem um YDD antigo de cabeçalhos compartilhados abaixo do orçamento, reparo idempotente, inspeção dos campos de fixup dos buffers e validação de dados completos. Essa inspeção estrutural não executa o RAGE: a renderização no FiveM precisa ser confirmada pelo usuário.

Extraia o portable completo em uma pasta nova. Para o arquivo que apresentou o erro, abra **03/05 → Compactar YDD já exportado**, selecione o YDD final usado no pack (por exemplo, accs_007_u.ydd), extraia o resultado e substitua o YDD antigo. Continue usando o YTD correspondente. Novas conversões recebem a correção automaticamente.

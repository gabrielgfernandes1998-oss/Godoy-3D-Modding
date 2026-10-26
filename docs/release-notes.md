# Godoy 3D Modding 0.11.2 beta

- A aba 05 incorpora a operação do Teste 1 confirmado pelo usuário no grzyClothTool: reabre YDD/YTD, sincroniza nomes/hashes/material e resalva o par antes de gerar o ZIP.
- Verifica os arquivos finais: todos os LODs, bytes dos vértices (posição, normal, UV, cores e pesos), índices, paletas de ossos e todos os pixels/mipmaps devem permanecer iguais. Rejeita pares sem diffuse correspondente.
- “Usar próximo índice”, histórico por gênero/componente neste computador e opção “Avançar índice após exportar”, ativada por padrão. É possível desativar o avanço ou informar um índice manualmente para atualizar uma peça.
- A interface mostra os nomes do par exportado e avisa quando reutiliza um índice já exportado. O histórico local não conhece os índices usados em outros programas ou computadores; confira o pack/grzy.
- A ponte confirma a normalização e o relatório conversao.json registra o perfil. Mantém pintura, atlas, posicionamento e osso selecionado.

Validação com o par real enviado: a rotina de produção reproduziu byte a byte o YDD e o YTD do Teste 1 que o usuário confirmou no grzy, incluindo a pintura. O Teste 2 também foi confirmado; não é necessário aplicar suas alterações de estrutura ao exportador. Ainda não foi isolado o papel de cache/reimportação em relação ao resalvamento. Os testes de regressão cobrem o par, os nomes, o histórico e o executável Windows. Aparência/animação no FiveM continua sem validação direta.

Para usar: na aba 05, escolha um índice livre no seu pack, posicione a peça e exporte. Importe YDD e YTD juntos no grzy; ao substituir uma peça em um projeto existente, feche/reabra o grzy ou use um projeto novo para conferir a prévia.

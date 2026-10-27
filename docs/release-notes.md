# Godoy 3D Modding 0.11.6 beta

- Corrige YDDs que continuavam acima do limite do FiveM por desperdício na organização das páginas, mesmo depois de compartilhar os buffers dos LODs.
- O compactador testa organizações válidas, mantém cada bloco inteiro e alinhado e escolhe uma reserva menor. A organização original continua como alternativa. O serializador usa as mesmas estruturas CodeWalker, sem modificar o compilador global de YTD/YMT/peds.
- A conversão e a exportação nativa de YDD aplicam a correção quando o tamanho reservado excede o orçamento. Nas abas 03/05, **Compactar YDD já exportado** também repara arquivos que já compartilham buffers.
- Mantém o limite de 100.000.000 bytes. Não remove triângulos nem reduz a textura. Verifica geometria, declaração de vértices, UVs, cores, pesos, vínculos, esqueleto, pose e pixels de texturas embutidas após reabrir o resultado.

Validação no pacote da mochila fornecido: arquivo YDD de 117.619.092 para 58.604.903 bytes. A organização anterior, após compartilhar buffers, reservava 100.663.296 bytes; a nova reserva é 81.788.928 bytes. Os dois LODs mantêm 103 partes, 1.523.975 vértices e 2.233.750 triângulos cada. O YTD original permanece sem alteração. Leitura nativa e pelo parser do editor concluídas; renderização no FiveM ainda depende do teste do usuário.

Inclui regressões sintéticas de YDD já compartilhado acima do orçamento, preservação de texturas embutidas, blocos mistos com alinhamento e fronteiras de página, além do teste do compactador no executável Windows.

Extraia o portable completo numa pasta nova. Abra **03 ou 05 → Compactar YDD já exportado**, escolha o YDD original e use o resultado com seu YTD atual. Novas conversões recebem o reparo automaticamente quando necessário.

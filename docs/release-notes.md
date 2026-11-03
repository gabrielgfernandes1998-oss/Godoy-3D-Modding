# Godoy 3D Modding 0.11.12 beta

- A guia 03 importa OBJ e GLB pelo botão **Adicionar OBJ / GLB**. GLB estático usa as cores e imagens embutidas PNG/JPEG/WebP dos materiais, com preview texturizado.
- **Unir OBJ / GLB à peça** incorpora o objeto ao YDD preservando a posição mostrada na cena. Cada parte herda os pesos da região mais próxima, em todos os LODs existentes.
- Com o YTD original associado, **Exportar YDD + ajustar UV** reúne a diffuse do YDD e o atlas dos materiais do GLB em uma única textura YTD. Os UVs do GLB são remapeados para a região escolhida, sem gerar novas ilhas por triângulo. Partes do mesmo GLB compartilham o atlas, evitando cópias redundantes da imagem.
- O editor UV mostra as duas texturas e permite mover/redimensionar as áreas. Para GLB, começa com áreas separadas e bloqueia sobreposição com a roupa. O ZIP inclui YDD, YTD, guia UV PNG, textura PNG e relatório do atlas.
- Mantém o fluxo OBJ com áreas cinza para pintura e as correções anteriores de ossos, LODs, material, buffers e orçamento do FiveM.

Como usar: importe o YDD, adicione o GLB, ajuste sua posição/escala, escolha o YDD de destino e una. Associe o YTD original, exporte e confirme a distribuição UV. Use o novo YDD com o novo YTD juntos.

O GLB precisa ser estático e ter suas imagens embutidas; não importa arquivos externos, skin/morphs ou cores por vértice. A composição usa a cor/diffuse dos materiais; normal/metallic/roughness PBR do GLB não são convertidos. Os mapas auxiliares compatíveis do YDD são mantidos no atlas nativo. A união mantém os limites de 65535 vértices por parte, 100000 no total e 32 partes. Texturas são transportadas separadamente em arquivos temporários binários. Atlas até 4096×4096 pode reduzir detalhes; a resolução é informada antes de exportar. Para reunir roupa com GLB em áreas separadas, os UVs da roupa precisam estar em 0–1; UVs repetidos exigem preparação anterior.

Testes com fixtures sintéticas verificam cores/orientação da textura, UVs, posição, pesos, todos os LODs, uma única diffuse, editor UV e proteção contra sobreposição. A aparência e animação com arquivos reais ainda precisam ser conferidas no FiveM.

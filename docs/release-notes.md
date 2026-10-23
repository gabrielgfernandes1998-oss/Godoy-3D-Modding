# Godoy 3D Modding 0.9.0 beta

- Nova aba **05 · Converter OBJ em YDD**: cria um YDD novo contendo somente a geometria do OBJ, com esqueleto do ped CodeWalker e vínculo rígido ao osso escolhido. Nenhum YDD de roupa de origem é necessário.
- Lista os ossos reais do ped, leva o OBJ ao osso e permite ajustar posição/rotação/escala com os mesmos controles 3D e histórico de posicionamento Ctrl+Z/Ctrl+Y.
- Mantém o UV existente do OBJ ou gera ilhas separadas por triângulo. Escolha resolução de 512–4096, cor ou uma imagem PNG/JPG/WebP como diffuse única.
- Exporta ZIP com YDD, YTD com mipmaps completos, textura PNG, guia UV e JSON da conversão. O par pode ser reaberto na pintura ou importado no gerenciador de packs para gerar o recurso FiveM.
- CodeWalker reabre e verifica os binários gerados. Testes cobrem peça sem geometria do ped, vínculo cabeça/cintura, pesos/UV/cor de vértices, sampler e pixels/mipmaps do YTD. O teste Windows também converte e reabre a peça na pintura.

Vínculo rígido a um osso; não gera pesos deformáveis entre várias articulações nem física. LOD alto/baixo compartilham a forma sem simplificação automática. UV automático é por triângulo, sem unwrap artístico. Materiais MTL/múltiplas imagens não são importados; selecione uma diffuse e mantenha seu UV correspondente. Requer o portable para gerar binários; ped do GTA não é distribuído. Assets reais do usuário e aparência/animação no FiveM precisam de validação.

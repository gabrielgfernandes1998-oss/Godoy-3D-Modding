# Godoy 3D Modding 0.6.3 beta

- Corrige a falha “Tamanho de recurso inválido ou acima do limite de 256 MB descomprimidos” no atlas 4096 com normal e specular: os mapas auxiliares embutidos usam até 2048×2048 e mipmaps completos. A diffuse continua em até 4096; os UVs normalizados permanecem alinhados. O cálculo mostra a resolução auxiliar e `atlas-info.json` registra `auxiliaryResolution`. Pode haver perda de detalhes de relevo/brilho.
- Mantém o limite de leitura de 256 MiB. Regressão exporta/reabre um par real RSC7 sintético com diffuse 4096 e dois mapas auxiliares; o YDD reserva cerca de 64 MiB em vez de mais de 256 MiB.
- Corrige o bloqueio de tamanho do atlas com ajuste automático de resolução: opções **Ajustar até 4096**, **2048**, **1024** e **Preservar resolução original**. A redução, quando necessária, é informada na tela e usa filtro de área com alpha, mantendo UVs e mapas auxiliares alinhados.
- Materiais que usam imagens idênticas compartilham a mesma região UV. O empacotador escolhe a quantidade de colunas que exige o menor atlas, evitando cópias e espaço desperdiçado.
- Novo botão **Calcular tamanho do atlas** mostra dimensões finais, quantidade de materiais/áreas e fator de redução antes de exportar. O cálculo não modifica a malha. O ZIP inclui `atlas-info.json` com esses dados.
- O modo **Preservar** mantém os pixels quando couber; se o atlas necessário exceder 4096×4096, mostra o tamanho exigido e orienta escolher Ajustar. O limite de 16 megapixels foi mantido.
- Remove do YDD imagens originais que deixaram de ser referenciadas após o atlas, mantendo mapas auxiliares e paletas necessários.
- Inclui as correções de placeholder givemechecker, ped por IPC e atlas único das versões anteriores.

Limites restantes: redução pode perder detalhes finos, explicitada na opção e no cálculo; atlas quadrado até 4096×4096. OBJ inicia cinza e com ilhas triangulares. UV original fora de 0–1, mapas auxiliares realmente ausentes e samplers especiais continuam sendo recusados para preservar o material. Sem MTL/imagens OBJ, colisão ou decimação. Aparência/animação com arquivos reais no grzy/FiveM ainda exige validação no computador do usuário.

# Godoy 3D Modding 0.7.0 beta

- Nova janela de ajuste UV ao exportar YDD com OBJ incorporado e YTD associado. Mostra a textura, as ilhas do OBJ e opcionalmente o UV original da roupa.
- A roupa começa no mapa inteiro e o OBJ em uma área pequena. Arraste a área do OBJ, redimensione pelo canto ou informe X/Y/largura/altura em pixels. Resolução final selecionável de 512 a 4096. Confirmação exporta YDD + YTD + PNGs + atlas-info.json com os retângulos usados.
- Desfazer/refazer próprios da janela (Ctrl+Z/Ctrl+Y), cancelamento sem alterar a cena e opção de restaurar a distribuição automática anterior.
- A roupa no mapa inteiro conserva seus UVs em todos os LODs. Com atlas na resolução original, conserva os pixels fora das regiões reservadas. O OBJ recebe a posição e escala UV escolhidas; posição 3D, rig e pesos continuam preservados.
- Valida limites, áreas mínimas e sobreposição entre dois OBJ ou duas imagens da roupa. Mapas auxiliares continuam em até 2048 para evitar a reserva acima de 256 MiB.

Escolha uma região livre: os pixels no retângulo OBJ serão substituídos por cinza para pintura. Não há detecção automática de espaços UV livres. Para preservar detalhes, use YDD/YTD originais, pois aumentar uma textura já reduzida não recupera resolução. Ajuste por parte OBJ, sem edição individual de vértices UV/unwrap artístico ou importação de MTL/imagens. Aparência/animação no grzy/FiveM com arquivos reais do usuário ainda precisa de validação.

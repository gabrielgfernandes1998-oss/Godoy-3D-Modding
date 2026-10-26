# Godoy 3D Modding 0.10.0 beta

- Aba 05 aceita OBJ e GLB. GLB lê imagens PNG/JPEG/WebP embutidas, fatores de cor e transformações de UV/objetos; recursos externos são recusados.
- Atlas reúne as cores em uma única diffuse YTD. Componentes físicos desconectados recebem áreas próprias, inclusive quando usam o mesmo material. Peças de cor uniforme ganham UVs sem sobreposição. Mantém normais, posições e todos os triângulos.
- “Atlas dos materiais” é o padrão do GLB e recomenda resolução de até 4096 para preservar imagens. “Isolar cada triângulo” transfere as cores para ilhas totalmente separadas e pode reduzir definição. Não substitui um unwrap artístico.
- Pintura 3D ganha “Proteger outras peças”: pincel/borracha respeitam a região UV da geometria atingida e não conectam pinceladas entre geometrias. Mapa UV 2D continua livre. Prévia de malhas grandes usa amostra de linhas UV.
- Imagens RGBA seguem também por arquivo binário temporário para o CodeWalker, evitando expansão base64 de atlas 4K. Mantém ZIP com YDD/YTD, PNG, guia UV completo e relatório de materiais/áreas.
- Validação local com o GLB enviado: 5 materiais, 97 áreas independentes, 491.742 triângulos preservados e atlas 4096. Após exportar e reabrir na pintura, pincel de 180 px na argola alterou 25.408 pixels em uma única área; as outras 96 ficaram intactas. O arquivo do usuário permanece privado.

O shader diffuse não reproduz reflexos metálicos, normal maps, roughness ou outros efeitos PBR do site. UV compartilhado dentro de um componente texturizado é preservado no modo padrão; use Isolar cada triângulo para separar esses casos, considerando a perda de detalhe. GLB estático/autossuficiente, sem skin/morph/cores por vértice ou Draco/KTX2 sem decodificador. Testes com o modelo real usaram ped de referência sintético; aparência/animação no FiveM não foi validada. Reimporte o GLB e gere YDD/YTD novos; pares antigos não são remapeados automaticamente.

# Godoy 3D Modding 0.4.0 beta

- União OBJ + YDD com destino explícito: não depende de selecionar a mochila/colete no viewport antes de unir. Evita usar o OBJ como seu próprio destino.
- A união vira um conjunto no editor e pode ser desfeita/refeita. Preserva a posição inclusive com escala não uniforme no YDD.
- Exportação nativa incorpora a geometria OBJ aos LODs do YDD original, herdando material, palette de ossos e pesos da região mais próxima.
- Preserva UVs do OBJ ou cria projeção planar quando faltam; calcula tangentes e mantém os canais do layout de vértices do destino.
- Reabre e verifica o arquivo consolidado. Nome original e associação ao YTD são mantidos.

Limites: reutiliza o material/YTD do destino; não insere textura própria/MTL nem cria atlas. Copia a geometria aos LODs sem decimação. Até 65535 vértices por parte, 100000 no total, 32 partes e 10 MB de dados. Sem solda booleana, edição de colisões ou exportação YFT. Teste de animação no FiveM com assets reais ainda pendente.

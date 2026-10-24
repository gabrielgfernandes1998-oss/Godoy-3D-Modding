# Godoy 3D Modding 0.9.1 beta

- Corrige a importação que parava com “Divida o OBJ em partes de até 65535 vértices”. O módulo 05 agora faz essa divisão automaticamente, em limites de triângulos completos.
- Preserva posições, normais, UVs existentes e transformações da hierarquia. As partes continuam um único objeto para selecionar, posicionar e converter; ficam reunidas no mesmo drawable YDD e usam a mesma textura YTD.
- UV automático continua a numeração das ilhas entre as partes, sem sobreposição criada pela divisão. É possível voltar ao UV original.
- Conversor aceita até 500000 vértices após triangulação, 32 partes e 32 MB de dados serializados. O limite de 20 MB do arquivo OBJ continua. As restrições do módulo 03 de incorporação não foram alteradas.
- Regressões verificam divisão de 120006 vértices com atributos/transformações preservados e exportação nativa de 120000 vértices em todos os LODs. O teste do portable Windows importa, divide e converte uma peça acima do limite antigo.

Vínculo rígido a um osso; sem simplificação automática. A divisão mantém toda a geometria e não reduz o peso da malha. Para arquivos acima dos limites totais, reduza a geometria. A aparência no FiveM com o OBJ real da captura não foi validada neste ambiente.

# Godoy 3D Modding 0.6.0 beta

- Atlas único de roupa + OBJ: remapeia o UV original para a região esquerda e reserva a direita para as ilhas dos objetos incorporados, em todos os LODs. Mantém posições, ossos e pesos.
- Um único item diffuse no YTD exportado, com o nome principal da roupa. A primeira textura usada pelo override de ped/grzy é o próprio atlas; não há mapas neutros disputando essa posição.
- Preserva os pixels da diffuse original na resolução original dentro do atlas. Normal/specular disponíveis são reorganizados e incorporados no YDD; a região do OBJ recebe mapas neutros. Paletas reconhecidas são preservadas.
- **Exportar YDD + atlas UV** baixa ZIP com YDD, YTD, `UV/atlas-textura.png`, `UV/atlas-uv.png` transparente e instruções. Em Pintura de roupas, roupa e OBJ são editados na mesma textura.
- Mantém as correções de ped via IPC e hashes GTA da 0.5.2.

Limites: atlas quadrado de até 4096×4096 (16 megapixels), sem reduzir automaticamente a resolução da roupa; dados regravados em BGRA8 com mipmaps. Área do OBJ começa cinza; não importa MTL/imagens OBJ. O UV do OBJ usa ilhas triangulares. Requer UV original em 0–1 e shaders com diffuse/normal/specular e paleta reconhecidos; samplers especiais, mapas auxiliares ausentes e UVs repetidos são recusados com mensagem para preservar o material. Limites da união: 21845 triângulos por parte, 100000 vértices no total, 32 partes e 10 MB. Não faz solda booleana, decimação nem colisão. A aparência/animação com os arquivos reais do usuário ainda precisa de validação no grzy/FiveM.

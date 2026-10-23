# Godoy 3D Modding 0.8.4 beta

- Corrige a exportação YDD + YTD + OBJ que falhava com “UV original fora de 0–1” mesmo usando a roupa no mapa inteiro. Coordenadas negativas e maiores que 1 são preservadas exatamente em todos os LODs, mantendo a repetição da textura e as faces que atravessam seus limites.
- No ajuste UV, use **Roupa no mapa inteiro**, posicione o OBJ na área que pode ser substituída e confirme a exportação. A textura original mantém sua distribuição; os pixels da área reservada são substituídos para pintar o OBJ.
- O editor avisa antes de exportar se uma roupa com UV repetido foi reduzida para uma subárea. Esse caso exige recorte das faces; limitar ou dobrar coordenadas por vértice deformaria a textura.
- Inclui ajustes do preview da 0.8.3: diffuse associada nas malhas, repetição de textura, profundidade no pack, opção de ped transparente e troca de referência ao importar outro gênero.

Teste nativo reabre YDD/YTD com OBJ, UV negativo e acima de 1, verificando coordenadas exatas em todos os LODs. O teste do portable Windows também exporta essa geometria repetida. O ped continua estático e neutro. Assets reais do usuário e aparência no FiveM/grzy não foram validados neste ambiente.

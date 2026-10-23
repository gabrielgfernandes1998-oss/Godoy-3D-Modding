# Godoy 3D Modding 0.8.3 beta

- Associar YTD em Malhas e objetos agora aplica a diffuse na pré-visualização da peça, incluindo todos os LODs, sem pintar o OBJ incorporado com a textura da roupa.
- Preview do pack e das malhas repete texturas com UV fora de 0–1, evitando o esticamento das bordas. A seleção respeita o YTD da variação, com correspondência pelo nome e alternativa para variações renomeadas.
- Ped da aba de malhas começa opaco. A opção Ped transparente permite consultar o encaixe sem confundir a sobreposição de faces com defeito na geometria. Transparência recortada da roupa no pack usa teste alfa e grava profundidade.

- Importar peças de outro gênero limpa/troca a referência do preview do pack, evitando combinar roupa feminina com o ped masculino anterior. Enquadrar com ped oculto usa as roupas visíveis.

Preview estático e ped em material neutro. Essas correções não alteram posição, escala, rig ou exportação. O bloqueio do atlas para UV repetido fora de 0–1 continua: encaixar texturas repetidas em uma área menor exige tratamento próprio das faces, não apenas limitar as coordenadas. Aparência e encaixe com assets reais precisam de validação; a captura de tela não permite determinar se existe outro problema de pose ou alinhamento.

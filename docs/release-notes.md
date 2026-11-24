# Godoy 3D Modding 0.11.17 beta

Esta atualização reúne novas ferramentas no **Editor de pinturas de viaturas** para GTA V Legacy e FiveM.

## Texto nas pinturas

- Espelhe o texto na horizontal ou na vertical, gire de 0° a 360° e ajuste largura e altura separadamente.
- Inverta a ordem dos caracteres em cada linha preservando o formato das letras e os acentos.
- Combine os ajustes e acompanhe o resultado na prévia. O projeto `.paintfive` mantém o texto editável e as exportações PNG e YTD incluem as transformações.

## Assentos e giroflex

- Em **Inspeção da viatura**, veja no 3D os lugares do motorista e dos passageiros identificados no modelo.
- Ative **Prévia do giroflex** para ver a posição, a cor e a sequência dos canais identificados. Importe o `carcols.meta` para escolher um perfil. Sem esse arquivo, o editor usa uma alternância demonstrativa.

## Importação em lote e liveries

- Em **Abrir arquivos da viatura**, selecione o YFT, os YTDs, o `carcols.meta` e o `carvariations.meta` juntos. O editor usa os metadados disponíveis para associar a textura e o perfil do giroflex.
- Em um YTD externo com liveries numeradas já referenciadas pelo YFT, selecione uma pintura para editar, duplique-a, importe uma imagem na mesma resolução ou remova uma pintura. A remoção renumera as seguintes.
- A exportação do YTD com a lista alterada usa o nome original do arquivo. Quando o `carvariations.meta` contém uma lista compatível, também é possível exportar uma cópia atualizada pelo painel **Liveries**.

A disponibilidade dos assentos e canais depende dos pontos do modelo. Confira a iluminação e as pinturas exportadas com o mod carregado no FiveM.

## Windows x64

Extraia todo o ZIP e abra **Godoy3DModding.exe**. O pacote é portátil e inclui o arquivo SHA-256 para conferir o download.

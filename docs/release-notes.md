# Godoy 3D Modding 0.2.1 beta — correção da tela vazia

Extraia todo o novo ZIP para uma pasta separada e execute `Godoy3DModding.exe`.

- Corrige a inicialização desktop: os assets eram bloqueados pelo filtro de rede interno ao carregar `file://` indiretamente.
- Mantém o sandbox e serve os arquivos locais diretamente do ASAR, com tipos MIME e CSP.
- Adiciona logs/avisos de falha de inicialização.
- Adiciona biblioteca local de ped masculino/feminino em Malhas: importe YDD/GLB uma vez, alterne gênero e visibilidade. O ped de referência não entra na exportação GLB.
- Adiciona teste desktop do EXE empacotado em Windows, com importação, pintura, download e armazenamento local; a Release só é publicada após ele passar.

O grzyClothTool foi analisado como referência; ele utiliza a instalação local GTA V para obter peds. Não foram copiados código GPL nem modelos do jogo para este pacote.

Continuam pendentes recompilação de novas geometrias YDD/YFT, rigging completo, geração de _hi.yft e validação no FiveM. O teste Windows usa renderização por software no CI e não substitui conferir o driver/GPU do seu computador. O aplicativo não é assinado digitalmente.

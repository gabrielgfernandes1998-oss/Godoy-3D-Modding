# Godoy 3D Modding 0.2.3 beta

- Corrige o enquadramento ao adicionar OBJ: a cena e a câmera existentes permanecem; há um botão para enquadrar a cena inteira.
- Adiciona Ctrl+Z, Ctrl+Y e Ctrl+Shift+Z para importações, transformações numéricas/gizmo e união de malhas, com histórico de 32 operações.
- Adiciona ponte .NET self-contained para o CodeWalker instalado pelo usuário. Em Malhas, configure as pastas do CodeWalker e GTA V Legacy e solicite o ped masculino/feminino do x64v.rpf.
- A leitura não modifica a instalação GTA. O ped de referência permanece separado da exportação GLB.
- Mantém o teste do EXE Windows antes de publicar; inclui regressões de visibilidade do modelo após OBJ, desfazer/refazer e inicialização do helper .NET.

Requer CodeWalker.Core.dll e suas dependências locais, além de GTA V Legacy, para a nova leitura de ped. Essas bibliotecas e modelos não são incluídos no ZIP. O runtime .NET do adaptador está incluído.

Limites: preview estático, somente componentes base de x64v.rpf, sem resolução completa de DLCs/animações. Leitura de ped de uma instalação real ainda precisa de validação no computador do usuário; no ambiente de desenvolvimento foram testadas a conexão com CodeWalker.Core e a serialização YDD usando um recurso de referência. Novas geometrias OBJ ainda saem em GLB, sem recompilação em YDD/YFT ou geração de _hi.yft. A validação FiveM continua pendente.

Feche o aplicativo anterior e extraia todo o ZIP numa pasta nova.

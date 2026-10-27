# Godoy 3D Modding 0.11.3 beta

- Corrige falhas como “Biblioteca local indisponível: Internal error” que impediam importar/carregar o ped e listar seus ossos quando o IndexedDB não abria.
- No portable, a biblioteca usa arquivos locais do aplicativo por gênero, separados entre preview e esqueleto, com gravação atômica. Não depende do IndexedDB para salvar novos peds.
- Registros antigos são migrados quando podem ser lidos; a biblioteca antiga não é apagada nem reinicializada automaticamente. Se ela estiver inacessível, carregue o ped do GTA ou importe novamente uma vez.
- Se tanto disco quanto IndexedDB falharem, o ped e o esqueleto ficam utilizáveis na sessão atual, com aviso explícito de que precisarão ser importados após reabrir. Falha de salvamento deixa de bloquear o ped na cena e a conversão.
- Leitura da biblioteca antiga tem prazo e tratamento de bloqueio. Remoção persistente impede que uma cópia antiga reapareça por migração.

Validação: 86 testes JS e navegador completo, incluindo IndexedDB com erro Internal error, resposta simulada de ped do CodeWalker e conversão usando esqueleto em memória. O teste do executável Windows verifica biblioteca real por IPC/disco, recarregamento com IndexedDB indisponível e exportação após simular falha também no diretório da biblioteca.

Extraia o portable completo em uma pasta nova. Se o ped antigo não reaparecer, use Carregar ped deste gênero do GTA ou importe o YDD de referência; a nova cópia será salva em disco quando disponível. Nenhum arquivo GTA foi incluído no aplicativo.

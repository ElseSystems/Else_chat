#!/usr/bin/env bash
# Menu de ferramentas. Os comandos vêm de doctools.md (blocos <!-- ferramenta ... -->).
set -u
cd "$(dirname "$0")"
DOC="doctools.md"

if [[ ! -f "$DOC" ]]; then
  echo "Arquivo doctools.md não encontrado nesta pasta."
  exit 1
fi

GREEN=$'\033[0;32m'
CYAN=$'\033[0;36m'
YELLOW=$'\033[1;33m'
DIM=$'\033[2m'
BOLD=$'\033[1m'
RED=$'\033[0;31m'
NC=$'\033[0m'

cleanup() {
  tput cnorm 2>/dev/null || true
  stty echo 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# categoria<TAB>titulo<TAB>comando<TAB>explica<TAB>confirma<TAB>pergunta
mapfile_compat() {
  ITEMS=()
  while IFS= read -r line || [[ -n "$line" ]]; do
    ITEMS+=("$line")
  done < <(
    awk '
      function flush() {
        if (inside && titulo != "") {
          gsub(/\t/, " ", titulo)
          gsub(/\t/, " ", comando)
          gsub(/\t/, " ", explica)
          gsub(/\t/, " ", pergunta)
          if (confirma == "") confirma = "nao"
          printf "%s\t%s\t%s\t%s\t%s\t%s\n", categoria, titulo, comando, explica, confirma, pergunta
        }
      }
      /^<!--[[:space:]]*ferramenta[[:space:]]*$/ {
        flush()
        inside = 1
        categoria = "Geral"
        titulo = ""
        comando = ""
        explica = ""
        confirma = "nao"
        pergunta = ""
        next
      }
      inside && /^-->[[:space:]]*$/ { next }
      inside && /^categoria:[[:space:]]*/ { categoria = substr($0, index($0, ":") + 1); sub(/^[[:space:]]+/, "", categoria); next }
      inside && /^titulo:[[:space:]]*/ { titulo = substr($0, index($0, ":") + 1); sub(/^[[:space:]]+/, "", titulo); next }
      inside && /^comando:[[:space:]]*/ { comando = substr($0, index($0, ":") + 1); sub(/^[[:space:]]+/, "", comando); next }
      inside && /^explica:[[:space:]]*/ { explica = substr($0, index($0, ":") + 1); sub(/^[[:space:]]+/, "", explica); next }
      inside && /^confirma:[[:space:]]*/ { confirma = substr($0, index($0, ":") + 1); sub(/^[[:space:]]+/, "", confirma); next }
      inside && /^pergunta:[[:space:]]*/ { pergunta = substr($0, index($0, ":") + 1); sub(/^[[:space:]]+/, "", pergunta); next }
      END { flush() }
    ' "$DOC"
  )
}

mapfile_compat
if [[ ${#ITEMS[@]} -eq 0 ]]; then
  echo "Nenhuma ferramenta encontrada em $DOC."
  echo "Cada comando precisa de um bloco <!-- ferramenta ... -->."
  exit 1
fi

field() {
  local line="$1" n="$2"
  echo "$line" | awk -F '\t' -v n="$n" '{print $n}'
}

unique_cats() {
  CATS=()
  local line c seen="|"
  for line in "${ITEMS[@]}"; do
    c="$(field "$line" 1)"
    case "$seen" in
      *"|$c|"*) ;;
      *) CATS+=("$c"); seen="${seen}${c}|" ;;
    esac
  done
}

draw_menu() {
  local title="$1"
  local hint="$2"
  local selected="$3"
  shift 3
  local -a labels=("$@")
  local i
  tput cup 0 0 2>/dev/null || true
  clear
  echo -e "${GREEN}${BOLD}${title}${NC}"
  echo -e "${DIM}${hint}${NC}"
  echo
  for i in "${!labels[@]}"; do
    if [[ "$i" -eq "$selected" ]]; then
      echo -e "  ${CYAN}${BOLD}> ${labels[$i]}${NC}"
    else
      echo -e "    ${labels[$i]}"
    fi
  done
  local blank=$(( 8 ))
  for ((i=0; i<blank; i++)); do echo; done
}

read_key() {
  local k k2
  IFS= read -rsn1 k || return 1
  if [[ "$k" == $'\x1b' ]]; then
    # Bash 3.2 do macOS não aceita timeout fracionário; os dois bytes da seta já estão no buffer.
    IFS= read -rsn1 k2 || k2=""
    IFS= read -rsn1 k3 || k3=""
    k2="${k2}${k3}"
    case "$k2" in
      '[A') echo up ;;
      '[B') echo down ;;
      '[D') echo left ;;
      '[C') echo right ;;
      *) echo esc ;;
    esac
  elif [[ -z "$k" ]]; then
    echo enter
  elif [[ "$k" == "q" || "$k" == "Q" ]]; then
    echo quit
  else
    echo other
  fi
}

# devolve índice em SELECTED ou 255 para voltar
navigate() {
  local title="$1" hint="$2"
  shift 2
  local -a labels=("$@")
  local n=${#labels[@]}
  local sel=0 key
  tput civis 2>/dev/null || true
  while true; do
    draw_menu "$title" "$hint" "$sel" "${labels[@]}"
    local footer_row=$((4 + n + 1))
    tput cup "$footer_row" 0 2>/dev/null || true
    echo -e "${YELLOW}↑ ↓ navegar    Enter escolher    ← voltar    q sair${NC}"
    key="$(read_key)" || key="quit"
    case "$key" in
      up) sel=$(( (sel + n - 1) % n )) ;;
      down) sel=$(( (sel + 1) % n )) ;;
      enter|right) SELECTED=$sel; return 0 ;;
      left|esc) SELECTED=255; return 0 ;;
      quit) cleanup; echo; exit 0 ;;
    esac
  done
}

run_item() {
  local line="$1"
  local titulo comando explica confirma pergunta
  titulo="$(field "$line" 2)"
  comando="$(field "$line" 3)"
  explica="$(field "$line" 4)"
  confirma="$(field "$line" 5)"
  pergunta="$(field "$line" 6)"
  tput cnorm 2>/dev/null || true
  clear
  echo -e "${CYAN}${BOLD}${titulo}${NC}"
  echo
  echo -e "${YELLOW}O que isso faz:${NC} ${explica}"
  echo
  if [[ -z "$comando" ]]; then
    echo "Este item é só uma explicação. Não há comando para executar."
    echo
    read -r -p "Enter para voltar..."
    tput civis 2>/dev/null || true
    return
  fi
  echo -e "${DIM}Comando:${NC} $comando"
  echo
  local RESPOSTA=""
  if [[ -n "$pergunta" ]]; then
    read -r -p "$pergunta: " RESPOSTA
    if [[ -z "$RESPOSTA" ]]; then
      echo -e "${RED}Nada foi digitado. Comando cancelado.${NC}"
      read -r -p "Enter para voltar..."
      tput civis 2>/dev/null || true
      return
    fi
  fi
  if [[ "$confirma" == "sim" ]]; then
    local ok
    read -r -p "Executar agora? (s/N) " ok
    if [[ "$ok" != "s" && "$ok" != "S" ]]; then
      echo "Cancelado."
      read -r -p "Enter para voltar..."
      tput civis 2>/dev/null || true
      return
    fi
  fi
  echo
  echo -e "${GREEN}Executando...${NC}"
  echo
  eval "$comando"
  local code=$?
  echo
  if [[ $code -eq 0 ]]; then
    echo -e "${GREEN}Terminou sem erro.${NC}"
  else
    echo -e "${RED}O comando saiu com código ${code}.${NC}"
  fi
  echo
  read -r -p "Enter para voltar..."
  tput civis 2>/dev/null || true
}

unique_cats

while true; do
  navigate "Ferramentas deste repositório" "Escolha uma área. Os textos vêm de doctools.md." "${CATS[@]}"
  [[ "$SELECTED" -eq 255 ]] && { cleanup; echo "Até logo."; exit 0; }
  cat_name="${CATS[$SELECTED]}"
  while true; do
    LINES=()
    LABELS=()
    for line in "${ITEMS[@]}"; do
      if [[ "$(field "$line" 1)" == "$cat_name" ]]; then
        LINES+=("$line")
        LABELS+=("$(field "$line" 2)")
      fi
    done
    navigate "$cat_name" "Enter abre a explicação e pode executar o comando." "${LABELS[@]}"
    [[ "$SELECTED" -eq 255 ]] && break
    run_item "${LINES[$SELECTED]}"
  done
done

#!/bin/sh
# Makes and removes git worktrees under .worktrees/ in the main checkout.
# Usage: scripts/worktree.sh add <name> | remove <name> | list
# A worktree needs no `npm install`: Node looks for node_modules in each parent folder, so it finds the main one.
set -eu

main=$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")
command=${1:-}
name=${2:-}

need_name() {
    if [ -z "$name" ]; then
        echo "Give a name, for example: npm run wt -- $command my-feature" >&2
        exit 1
    fi
    git check-ref-format --branch "$name" >/dev/null
}

case "$command" in
    add)
        need_name
        path="$main/.worktrees/$name"
        if git show-ref --verify --quiet "refs/heads/$name"; then
            git worktree add "$path" "$name"
        else
            git worktree add "$path" -b "$name"
        fi
        echo
        echo "Ready. Next: cd .worktrees/$name && npm run dev"
        ;;
    remove)
        need_name
        git worktree remove "$main/.worktrees/$name"
        if ! git branch -d "$name" 2>/dev/null; then
            echo "Kept branch $name: it has commits that are not merged. Delete it with: git branch -D $name"
        fi
        ;;
    list)
        git worktree list
        ;;
    *)
        echo "Usage: npm run wt -- <name> | npm run wt:rm -- <name> | npm run wt:ls" >&2
        exit 1
        ;;
esac

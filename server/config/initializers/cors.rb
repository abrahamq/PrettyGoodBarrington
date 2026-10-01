# Lets the game, which runs on a different origin, call this API.
# Development and test: the Vite dev server on port 8080, on this computer or another device on the local network.
# Production: only the origins listed in ALLOWED_ORIGINS (comma-separated), for example the hosted game's URL.
DEV_GAME_ORIGIN = %r{\Ahttp://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+):8080\z}

allowed_origins = ENV.fetch("ALLOWED_ORIGINS", "").split(",").map(&:strip).reject(&:empty?)
allowed_origins << DEV_GAME_ORIGIN unless Rails.env.production?

if allowed_origins.any?
  Rails.application.config.middleware.insert_before 0, Rack::Cors do
    allow do
      origins(*allowed_origins)
      resource "*", headers: :any, methods: %i[get post patch options]
    end
  end
end

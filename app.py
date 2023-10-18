from flask import Flask
from models.database import db
from flask_swagger_ui import get_swaggerui_blueprint
from flask_cors import CORS, cross_origin
from models.electro_scooter import ElectroScooter


def create_app():
  app = Flask(__name__)
  # Configure SQLAlchemy to use SQLite
  # Must hide username & password in prod
  app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://warek:warek@localhost:5432/electro_scooter'
  # app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///your_database.db'

  # Solve CORS problem
  cors = CORS(app)
  app.config['CORS_HEADERS'] = 'Content-Type'

  db.init_app(app)
  return app


if __name__ == "__main__":
  app = create_app()
  import routes

  # Configure Swagger UI
  SWAGGER_URL = '/swagger'
  API_URL = 'http://127.0.0.1:5000/swagger.json'
  swaggerui_blueprint = get_swaggerui_blueprint(
    SWAGGER_URL,
    API_URL,
    config={
      'app_name': "Sample API"
    }
  )
  app.register_blueprint(swaggerui_blueprint, url_prefix=SWAGGER_URL)


  app.run()

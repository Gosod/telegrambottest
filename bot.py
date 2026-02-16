import os
import json
import logging
from datetime import datetime
from telegram import Update, KeyboardButton, ReplyKeyboardMarkup, WebAppInfo
from telegram.ext import (
    Application,
    CommandHandler,
    MessageHandler,
    ContextTypes,
    filters
)

# Настройка логирования
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# === НАСТРОЙКИ ===
TOKEN = '8514288248:AAG-OZ02ePaK1XbM5CXwC7OkCqiYBCYE_pw'
WEBAPP_URL = 'https://your-username.github.io/telegram-bot-webapp/'  # Замени на свой!

# Файлы для хранения данных
REPORTS_FILE = 'test_reports.json'
USERS_FILE = 'test_users.json'
PROJECTS_FILE = 'test_projects.json'

# ID администраторов
ADMIN_IDS = [699229724]  # Замени на свой ID!


def is_admin(user_id):
    """Проверка админа"""
    return user_id in ADMIN_IDS


def load_json(filename, default=None):
    """Загрузка JSON"""
    if default is None:
        default = []
    try:
        if os.path.exists(filename):
            with open(filename, 'r', encoding='utf-8') as f:
                return json.load(f)
    except Exception as e:
        logger.error(f"Ошибка загрузки {filename}: {e}")
    return default


def save_json(filename, data):
    """Сохранение JSON"""
    try:
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.error(f"Ошибка сохранения {filename}: {e}")


def get_projects():
    """Получить проекты"""
    default = [
        {"abbr": "РС", "full": "Разработка сайта"},
        {"abbr": "МРК", "full": "Маркетинг"},
        {"abbr": "КП", "full": "Клиентская поддержка"}
    ]
    projects = load_json(PROJECTS_FILE, default)
    if not projects:
        save_json(PROJECTS_FILE, default)
        projects = default
    return projects


def add_project(abbr, full_name):
    """Добавить проект"""
    projects = get_projects()
    
    for project in projects:
        if project['abbr'].upper() == abbr.upper() or project['full'].lower() == full_name.lower():
            return False, "Проект уже существует"
    
    projects.append({"abbr": abbr, "full": full_name})
    save_json(PROJECTS_FILE, projects)
    return True, "Проект добавлен"


def add_report(user_id, username, project, hours, comments):
    """Добавить отчёт"""
    reports = load_json(REPORTS_FILE, [])
    report = {
        'user_id': user_id,
        'username': username,
        'project': project,
        'hours': hours,
        'comments': comments,
        'date': datetime.now().strftime('%Y-%m-%d'),
        'datetime': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    }
    reports.append(report)
    save_json(REPORTS_FILE, reports)
    return report


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Команда /start - показывает кнопку Web App"""
    user = update.effective_user
    
    # Регистрируем пользователя
    users = load_json(USERS_FILE, {})
    if str(user.id) not in users:
        users[str(user.id)] = {
            'username': user.username or user.first_name,
            'registered_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
        save_json(USERS_FILE, users)
    
    # Получаем проекты для передачи в Web App
    projects = get_projects()
    projects_json = json.dumps(projects)
    
    # Формируем URL с параметрами
    url_with_params = f"{WEBAPP_URL}?admin={'true' if is_admin(user.id) else 'false'}&projects={projects_json}"
    
    # Создаём клавиатуру с Web App кнопкой
    keyboard = [
        [KeyboardButton("📱 Открыть приложение", web_app=WebAppInfo(url=url_with_params))]
    ]
    reply_markup = ReplyKeyboardMarkup(keyboard, resize_keyboard=True)
    
    welcome_text = f"""
👋 Привет, {user.first_name}!

🎨 Это Web App версия бота для учёта времени!

Нажми кнопку ниже чтобы открыть приложение 👇

<b>Что внутри:</b>
• 📝 Создание отчётов с красивым интерфейсом
• 📊 Статистика по работе
• 🎯 Удобная навигация
"""
    
    if is_admin(user.id):
        welcome_text += """
👑 <b>Для админа доступно:</b>
• ⚙️ Управление проектами
• 👥 Статистика по всем сотрудникам
"""
    
    await update.message.reply_text(
        welcome_text,
        reply_markup=reply_markup,
        parse_mode='HTML'
    )


async def handle_webapp_data(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обработка данных из Web App"""
    user = update.effective_user
    web_app_data = update.effective_message.web_app_data.data
    
    try:
        data = json.loads(web_app_data)
        data_type = data.get('type')
        
        if data_type == 'report':
            # Отчёт
            project = data.get('project')
            hours = data.get('hours')
            comments = data.get('comments', '-')
            
            report = add_report(
                user_id=user.id,
                username=user.username or user.first_name,
                project=project,
                hours=hours,
                comments=comments
            )
            
            await update.message.reply_text(
                f"✅ <b>Отчёт сохранён!</b>\n\n"
                f"📊 Проект: <b>{project}</b>\n"
                f"⏱ Часы: <b>{hours}</b>\n"
                f"💬 Комментарий: {comments}\n"
                f"📅 Дата: {report['date']}",
                parse_mode='HTML'
            )
            
            logger.info(f"Отчёт: {user.username} - {project} - {hours}ч")
            
        elif data_type == 'add_project':
            # Добавление проекта
            if not is_admin(user.id):
                await update.message.reply_text("⚠️ Только для админа")
                return
            
            abbr = data.get('abbr')
            full_name = data.get('full')
            
            success, message = add_project(abbr, full_name)
            
            if success:
                await update.message.reply_text(
                    f"✅ <b>Проект добавлен!</b>\n\n"
                    f"🔤 {abbr} - {full_name}\n\n"
                    f"Теперь доступен для отчётов!",
                    parse_mode='HTML'
                )
                logger.info(f"Проект добавлен: {abbr} - {full_name}")
            else:
                await update.message.reply_text(f"❌ {message}")
        
        else:
            await update.message.reply_text("❌ Неизвестный тип данных")
            
    except Exception as e:
        logger.error(f"Ошибка обработки Web App данных: {e}")
        await update.message.reply_text("❌ Ошибка обработки данных")


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Помощь"""
    help_text = """
📚 <b>Как пользоваться:</b>

1. Нажми кнопку "📱 Открыть приложение"
2. Откроется красивый интерфейс
3. Там можно:
   • Создавать отчёты
   • Смотреть статистику
   • (Админ) Управлять проектами

<b>Это полноценное приложение внутри Telegram!</b>

Никаких команд писать не нужно - всё в одном интерфейсе! 🎨
"""
    
    await update.message.reply_text(help_text, parse_mode='HTML')


def main():
    """Запуск бота"""
    application = Application.builder().token(TOKEN).build()
    
    # Регистрируем обработчики
    application.add_handler(CommandHandler('start', start))
    application.add_handler(CommandHandler('help', help_command))
    
    # Обработчик данных из Web App
    application.add_handler(MessageHandler(
        filters.StatusUpdate.WEB_APP_DATA,
        handle_webapp_data
    ))
    
    logger.info("🤖 Бот запущен!")
    logger.info(f"📱 Web App: {WEBAPP_URL}")
    logger.info("💡 Используйте /start для начала работы")
    
    application.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == '__main__':
    main()

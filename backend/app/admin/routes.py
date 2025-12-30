"""
Admin Routes
Provides endpoints for admin authentication and metrics.
"""
import logging
from datetime import datetime, timezone, timedelta
from flask import jsonify, request
from sqlalchemy import func, cast, Date

from app.admin import admin_bp
from app.extensions import db
from app.models import AdminUser, Conversion, PageView

logger = logging.getLogger(__name__)


def get_time_filter(period: str):
    """Get datetime filter based on period string."""
    now = datetime.now(timezone.utc)
    if period == '1d':
        return now - timedelta(days=1)
    elif period == '7d':
        return now - timedelta(days=7)
    elif period == '30d':
        return now - timedelta(days=30)
    return None  # 'all' - no filter


@admin_bp.route('/verify', methods=['POST'])
def verify_credentials():
    """
    Verify admin credentials.
    Called by Next.js to authenticate admin users.
    """
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')

        logger.info(f'Login attempt - username: {username}, password length: {len(password) if password else 0}')

        if not username or not password:
            return jsonify({'error': 'Username and password are required'}), 400

        # Find user in database
        user = AdminUser.query.filter_by(username=username).first()

        if not user:
            logger.warning(f'User not found: {username}')
            return jsonify({'error': 'Invalid credentials'}), 401

        logger.info(f'User found: {user.username} (id: {user.id}), hash prefix: {user.password_hash[:30]}...')

        password_ok = user.check_password(password)
        logger.info(f'Password check result: {password_ok}')

        if not password_ok:
            logger.warning(f'Failed admin login attempt for username: {username}')
            return jsonify({'error': 'Invalid credentials'}), 401

        # Update last login
        user.last_login = datetime.now(timezone.utc)
        db.session.commit()

        logger.info(f'Admin login successful: {username}')
        return jsonify({
            'id': user.id,
            'username': user.username,
        })

    except Exception as e:
        logger.error(f'Admin verification error: {e}', exc_info=True)
        return jsonify({'error': 'Authentication failed'}), 500


@admin_bp.route('/metrics/stats', methods=['GET'])
def get_stats():
    """
    Get aggregate statistics for the admin dashboard.
    Supports time period filtering via ?period=1d|7d|30d|all
    """
    try:
        period = request.args.get('period', 'all')
        time_filter = get_time_filter(period)

        # Base queries with time filter
        conv_query = Conversion.query
        pv_query = PageView.query

        if time_filter:
            conv_query = conv_query.filter(Conversion.created_at >= time_filter)
            pv_query = pv_query.filter(PageView.created_at >= time_filter)

        # Conversion stats
        total_conversions = conv_query.count()
        successful_conversions = conv_query.filter(Conversion.success == True).count()
        failed_conversions = conv_query.filter(Conversion.success == False).count()

        # Page view stats
        total_page_views = pv_query.count()
        unique_visitors = db.session.query(
            func.count(func.distinct(PageView.visitor_id))
        ).filter(
            PageView.created_at >= time_filter if time_filter else True
        ).scalar() or 0

        # Format breakdown - count occurrences of each format
        format_counts = {'docx': 0, 'pdf': 0, 'gdocs': 0}
        conversions = conv_query.all()
        for conv in conversions:
            formats = conv.formats.split(',') if conv.formats else []
            for fmt in formats:
                fmt = fmt.strip().lower()
                if fmt in format_counts:
                    format_counts[fmt] += 1

        # Daily conversions for chart
        daily_data = []
        if time_filter:
            # Get conversions grouped by day
            daily_query = db.session.query(
                cast(Conversion.created_at, Date).label('date'),
                func.count(Conversion.id).label('count')
            ).filter(
                Conversion.created_at >= time_filter
            ).group_by(
                cast(Conversion.created_at, Date)
            ).order_by(
                cast(Conversion.created_at, Date)
            ).all()

            daily_data = [
                {'date': str(row.date), 'count': row.count}
                for row in daily_query
            ]
        else:
            # For 'all', show last 30 days
            thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
            daily_query = db.session.query(
                cast(Conversion.created_at, Date).label('date'),
                func.count(Conversion.id).label('count')
            ).filter(
                Conversion.created_at >= thirty_days_ago
            ).group_by(
                cast(Conversion.created_at, Date)
            ).order_by(
                cast(Conversion.created_at, Date)
            ).all()

            daily_data = [
                {'date': str(row.date), 'count': row.count}
                for row in daily_query
            ]

        return jsonify({
            'totalConversions': total_conversions,
            'successfulConversions': successful_conversions,
            'failedConversions': failed_conversions,
            'totalPageViews': total_page_views,
            'uniqueVisitors': unique_visitors,
            'formatBreakdown': format_counts,
            'dailyConversions': daily_data,
        })

    except Exception as e:
        logger.error(f'Stats fetch error: {e}', exc_info=True)
        return jsonify({'error': 'Failed to fetch stats'}), 500


@admin_bp.route('/metrics/conversions', methods=['GET'])
def get_conversions():
    """
    Get recent conversions for the admin dashboard.
    Supports time period filtering via ?period=1d|7d|30d|all
    """
    try:
        limit = request.args.get('limit', 20, type=int)
        period = request.args.get('period', 'all')
        time_filter = get_time_filter(period)

        query = Conversion.query
        if time_filter:
            query = query.filter(Conversion.created_at >= time_filter)

        conversions = query.order_by(
            Conversion.created_at.desc()
        ).limit(limit).all()

        return jsonify({
            'conversions': [
                {
                    'id': c.id,
                    'job_id': c.job_id,
                    'formats': c.formats,
                    'success': c.success,
                    'error_code': c.error_code,
                    'processing_time_ms': c.processing_time_ms,
                    'created_at': c.created_at.isoformat(),
                }
                for c in conversions
            ]
        })

    except Exception as e:
        logger.error(f'Conversions fetch error: {e}', exc_info=True)
        return jsonify({'error': 'Failed to fetch conversions'}), 500


@admin_bp.route('/metrics/page-views', methods=['GET'])
def get_page_views():
    """
    Get recent page views for the admin dashboard.
    Supports time period filtering via ?period=1d|7d|30d|all
    """
    try:
        limit = request.args.get('limit', 20, type=int)
        period = request.args.get('period', 'all')
        time_filter = get_time_filter(period)

        query = PageView.query
        if time_filter:
            query = query.filter(PageView.created_at >= time_filter)

        page_views = query.order_by(
            PageView.created_at.desc()
        ).limit(limit).all()

        return jsonify({
            'pageViews': [
                {
                    'id': pv.id,
                    'path': pv.path,
                    'referrer': pv.referrer,
                    'browser': pv.browser,
                    'os': pv.os,
                    'device_type': pv.device_type,
                    'created_at': pv.created_at.isoformat(),
                }
                for pv in page_views
            ]
        })

    except Exception as e:
        logger.error(f'Page views fetch error: {e}', exc_info=True)
        return jsonify({'error': 'Failed to fetch page views'}), 500

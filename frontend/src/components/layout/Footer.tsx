import { FaGithub } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export default function Footer() {
    const { user } = useAuth();

    return (
        <footer className="bottom-0 flex">
            <a href="https://github.com/OzanYY/PrintCalc" className='text-sm flex items-center w-fit pr-5'><FaGithub /> <p className='ml-2'>github</p></a>
            {user?.role === 'admin' && (
                <Link
                    to="/admin"
                    className="text-xs text-muted-foreground hover:text-muted-foreground transition-colors"
                >
                    администрирование
                </Link>
            )}
        </footer>
    )
}
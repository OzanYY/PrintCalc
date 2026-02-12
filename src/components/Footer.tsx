import { FaGithub } from 'react-icons/fa';

export default function Footer() {
    return (
        <footer className="bottom-0">
            <a href="https://github.com/OzanYY/PrintCalc" className='text-sm flex items-center'><FaGithub /> <p className='ml-2'>github</p></a>
        </footer>
    )
}